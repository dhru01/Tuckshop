-- Fix pos_checkout / pos_close_shift: is_school_admin() is RLS-only (school_id); service RPCs pass p_actor_id.

create or replace function private.actor_is_school_admin(p_actor_id uuid, p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id
    join public.schools s on s.id = ra.school_id
    where ra.user_id = p_actor_id
      and ra.school_id = p_school_id
      and ra.role = 'school_admin'
      and ra.status = 'active'
      and p.status = 'active'
      and s.status in ('pending', 'active', 'suspended')
  );
$$;

revoke all on function private.actor_is_school_admin(uuid, uuid) from public;

create or replace function public.pos_close_shift(
  p_actor_id uuid,
  p_shift_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.cashier_shifts%rowtype;
begin
  select * into v_shift from public.cashier_shifts where id = p_shift_id for update;
  if not found then raise exception 'shift_not_found'; end if;
  perform private.assert_actor_pos(p_actor_id, v_shift.school_id);
  if v_shift.cashier_id <> p_actor_id and not private.actor_is_school_admin(p_actor_id, v_shift.school_id) then
    raise exception 'NOT_AUTHORISED';
  end if;
  if v_shift.status <> 'open' then raise exception 'shift_not_open'; end if;

  update public.cashier_shifts
  set status = 'closed', closed_at = now(), notes = nullif(trim(p_notes), '')
  where id = p_shift_id;

  return jsonb_build_object(
    'shift_id', v_shift.id,
    'sales_count', v_shift.sales_count,
    'sales_total_cents', v_shift.sales_total_cents
  );
end;
$$;

-- pos_checkout: only replace the shift-authorisation branch (full body unchanged otherwise).
create or replace function public.pos_checkout(
  p_actor_id uuid,
  p_school_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_credential_reference text,
  p_items jsonb,
  p_shift_id uuid,
  p_pos_device_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.purchases%rowtype;
  v_cred text := lower(trim(p_credential_reference));
  v_card public.nfc_cards%rowtype;
  v_learner public.learners%rowtype;
  v_wallet public.wallets%rowtype;
  v_shift public.cashier_shifts%rowtype;
  v_total bigint := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
  v_purchase_id uuid;
  v_receipt bigint;
  v_sales uuid;
  v_entries jsonb;
  v_tx_id uuid;
  v_balance_after bigint;
  v_spent_day bigint;
  v_spent_week bigint;
  v_limits public.spending_limits%rowtype;
  v_cat_name text;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    return jsonb_build_object('status', 'error', 'failure_code', 'SYSTEM_ERROR');
  end if;

  select * into v_existing
  from public.purchases
  where school_id = p_school_id and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_hash is distinct from p_request_hash then
      return jsonb_build_object('status', 'error', 'failure_code', 'IDEMPOTENCY_CONFLICT');
    end if;
    return jsonb_build_object(
      'status', 'completed',
      'purchase_id', v_existing.id,
      'receipt_number', v_existing.receipt_number,
      'total_cents', v_existing.total_cents,
      'wallet_balance_after_cents', v_existing.wallet_balance_after_cents
    );
  end if;

  if p_shift_id is null then
    return jsonb_build_object('status', 'declined', 'failure_code', 'SHIFT_REQUIRED');
  end if;

  select * into v_shift
  from public.cashier_shifts
  where id = p_shift_id and school_id = p_school_id and status = 'open'
  for update;

  if not found or (v_shift.cashier_id <> p_actor_id and not private.actor_is_school_admin(p_actor_id, p_school_id)) then
    return jsonb_build_object('status', 'declined', 'failure_code', 'SHIFT_REQUIRED');
  end if;

  select * into v_card from public.nfc_cards where credential_reference = v_cred and school_id = p_school_id for update;
  if not found then
    return jsonb_build_object('status', 'declined', 'failure_code', 'UNKNOWN_CARD');
  end if;
  if v_card.card_status <> 'active' then
    return jsonb_build_object('status', 'declined', 'failure_code', 'CARD_NOT_ACTIVE');
  end if;
  if v_card.expires_at is not null and v_card.expires_at < now() then
    return jsonb_build_object('status', 'declined', 'failure_code', 'CARD_EXPIRED');
  end if;

  select * into v_learner from public.learners where id = v_card.learner_id and school_id = p_school_id;
  if not found or v_learner.status <> 'active' then
    return jsonb_build_object('status', 'declined', 'failure_code', 'UNKNOWN_CARD');
  end if;

  select * into v_wallet from public.wallets where learner_id = v_learner.id and school_id = p_school_id for update;
  if not found or v_wallet.status <> 'active' then
    return jsonb_build_object('status', 'declined', 'failure_code', 'WALLET_FROZEN');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
  end if;

  for v_item in
    select e from jsonb_array_elements(p_items) as t(e) order by e->>'product_id'
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and school_id = p_school_id
    for update;
    if not found or not v_product.is_active or v_product.archived_at is not null then
      return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
    end if;
    if v_qty is null or v_qty <= 0 or v_qty > 99 then
      return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
    end if;
    if v_product.track_stock and v_product.stock_quantity < v_qty then
      return jsonb_build_object('status', 'declined', 'failure_code', 'INSUFFICIENT_STOCK');
    end if;
    v_total := v_total + v_product.price_cents * v_qty;
  end loop;

  if v_total <= 0 or v_total > 100000000 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
  end if;

  if v_wallet.balance_cents < v_total then
    return jsonb_build_object('status', 'declined', 'failure_code', 'INSUFFICIENT_FUNDS');
  end if;

  select * into v_limits from public.spending_limits where learner_id = v_learner.id and school_id = p_school_id;
  if found then
    v_spent_day := private.learner_spent_cents(p_school_id, v_learner.id, 'day');
    v_spent_week := private.learner_spent_cents(p_school_id, v_learner.id, 'week');
    if v_limits.daily_limit_cents is not null and v_spent_day + v_total > v_limits.daily_limit_cents then
      return jsonb_build_object('status', 'declined', 'failure_code', 'LIMIT_EXCEEDED');
    end if;
    if v_limits.weekly_limit_cents is not null and v_spent_week + v_total > v_limits.weekly_limit_cents then
      return jsonb_build_object('status', 'declined', 'failure_code', 'LIMIT_EXCEEDED');
    end if;
  end if;

  v_receipt := private.next_receipt_number(p_school_id);
  v_sales := private.ensure_school_ledger_account(p_school_id, 'school_sales', 'credit', 'Tuck shop sales');

  v_entries := jsonb_build_array(
    jsonb_build_object('account_id', v_wallet.ledger_account_id, 'direction', 'debit', 'amount_cents', v_total),
    jsonb_build_object('account_id', v_sales, 'direction', 'credit', 'amount_cents', v_total)
  );

  v_tx_id := private.post_ledger_transaction(
    p_school_id,
    'purchase',
    p_idempotency_key,
    'POS purchase',
    p_actor_id,
    'purchase',
    null,
    null,
    v_entries
  );

  select balance_cents into v_balance_after from public.wallets where id = v_wallet.id;

  insert into public.purchases (
    school_id, receipt_number, wallet_id, learner_id, card_id, cashier_id,
    shift_id, pos_device_id, total_cents, wallet_balance_after_cents,
    status, idempotency_key, request_hash, ledger_transaction_id
  )
  values (
    p_school_id, v_receipt, v_wallet.id, v_learner.id, v_card.id, p_actor_id,
    p_shift_id, p_pos_device_id, v_total, v_balance_after,
    'completed', p_idempotency_key, p_request_hash, v_tx_id
  )
  returning id into v_purchase_id;

  update public.ledger_transactions
  set reference_id = v_purchase_id, reference_type = 'purchase'
  where id = v_tx_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid;
    select name into v_cat_name from public.product_categories where id = v_product.category_id;

    insert into public.purchase_items (
      school_id, purchase_id, product_id, product_name, category_name,
      unit_price_cents, quantity, line_total_cents
    )
    values (
      p_school_id, v_purchase_id, v_product.id, v_product.name, v_cat_name,
      v_product.price_cents, v_qty, v_product.price_cents * v_qty
    );

    if v_product.track_stock then
      perform private.apply_inventory_movement(
        p_actor_id, p_school_id, v_product.id, 'sale', -v_qty,
        null, null, 'purchase', v_purchase_id,
        'POS sale', 'sale', null
      );
    end if;
  end loop;

  update public.nfc_cards set last_used_at = now() where id = v_card.id;

  update public.cashier_shifts
  set sales_count = sales_count + 1, sales_total_cents = sales_total_cents + v_total
  where id = p_shift_id;

  return jsonb_build_object(
    'status', 'completed',
    'purchase_id', v_purchase_id,
    'receipt_number', v_receipt,
    'total_cents', v_total,
    'wallet_balance_after_cents', v_balance_after,
    'learner_display_name', v_learner.first_name || ' ' || left(v_learner.last_name, 1) || '.'
  );
end;
$$;
