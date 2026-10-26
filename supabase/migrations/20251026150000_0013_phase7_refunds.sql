-- 0013: Phase 7 — purchase refunds (request, approval, ledger credit)

alter table public.purchase_items
  add column if not exists refunded_quantity int not null default 0;

alter table public.purchase_items
  add constraint purchase_items_refunded_qty_check
  check (refunded_quantity >= 0 and refunded_quantity <= quantity);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  purchase_id uuid not null,
  wallet_id uuid not null,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  status public.refund_status not null default 'requested',
  amount_cents bigint not null check (amount_cents > 0),
  reason text not null,
  restock boolean not null default false,
  idempotency_key text not null,
  ledger_transaction_id uuid references public.ledger_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (school_id, id),
  unique (school_id, idempotency_key),
  foreign key (school_id, purchase_id) references public.purchases (school_id, id) on delete restrict,
  foreign key (school_id, wallet_id) references public.wallets (school_id, id) on delete restrict
);

create table public.refund_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  refund_id uuid not null,
  purchase_item_id uuid not null references public.purchase_items (id) on delete restrict,
  quantity int not null check (quantity > 0),
  amount_cents bigint not null check (amount_cents > 0),
  unique (school_id, id),
  foreign key (school_id, refund_id) references public.refunds (school_id, id) on delete restrict
);

create index refunds_school_status_idx on public.refunds (school_id, status, created_at desc);

alter table public.refunds enable row level security;
alter table public.refunds force row level security;
alter table public.refund_items enable row level security;
alter table public.refund_items force row level security;

create policy refunds_select_staff on public.refunds
for select to authenticated
using (
  private.is_school_staff(school_id)
  or private.is_school_admin(school_id)
  or requested_by = auth.uid()
);

create policy refund_items_select_staff on public.refund_items
for select to authenticated
using (
  exists (
    select 1 from public.refunds r
    where r.id = refund_items.refund_id
      and (
        private.is_school_staff(r.school_id)
        or private.is_school_admin(r.school_id)
        or r.requested_by = auth.uid()
      )
  )
);

revoke insert, update, delete on public.refunds from authenticated;
revoke insert, update, delete on public.refund_items from authenticated;
grant select on public.refunds to authenticated;
grant select on public.refund_items to authenticated;

-- ---------------------------------------------------------------------------
-- Complete a refund (ledger + stock); called after approval or auto-approve.
-- ---------------------------------------------------------------------------

create or replace function private.complete_purchase_refund(
  p_actor_id uuid,
  p_refund_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.refunds%rowtype;
  v_purchase public.purchases%rowtype;
  v_wallet public.wallets%rowtype;
  v_sales uuid;
  v_tx_id uuid;
  v_entries jsonb;
  v_balance_after bigint;
  v_refunded_total bigint;
  v_item record;
  v_product public.products%rowtype;
begin
  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'refund_not_found'; end if;

  if v_refund.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'refund_id', v_refund.id,
      'amount_cents', v_refund.amount_cents,
      'wallet_balance_after_cents', (
        select balance_cents from public.wallets where id = v_refund.wallet_id
      )
    );
  end if;

  if v_refund.status not in ('requested', 'approved') then
    raise exception 'refund_not_completable';
  end if;

  select * into v_purchase from public.purchases where id = v_refund.purchase_id for update;
  select * into v_wallet from public.wallets where id = v_refund.wallet_id for update;

  v_sales := private.ensure_school_ledger_account(v_refund.school_id, 'school_sales', 'credit', 'Tuck shop sales');

  v_entries := jsonb_build_array(
    jsonb_build_object('account_id', v_sales, 'direction', 'debit', 'amount_cents', v_refund.amount_cents),
    jsonb_build_object('account_id', v_wallet.ledger_account_id, 'direction', 'credit', 'amount_cents', v_refund.amount_cents)
  );

  v_tx_id := private.post_ledger_transaction(
    v_refund.school_id,
    'purchase_refund',
    'refund:' || v_refund.idempotency_key,
    'Purchase refund',
    p_actor_id,
    'refund',
    v_refund.id,
    v_purchase.ledger_transaction_id,
    v_entries
  );

  select balance_cents into v_balance_after from public.wallets where id = v_wallet.id;

  for v_item in
    select ri.*, pi.product_id, pi.quantity as purchased_qty
    from public.refund_items ri
    join public.purchase_items pi on pi.id = ri.purchase_item_id
    where ri.refund_id = v_refund.id
  loop
    update public.purchase_items
    set refunded_quantity = refunded_quantity + v_item.quantity
    where id = v_item.purchase_item_id;

    if v_refund.restock and v_item.product_id is not null then
      select * into v_product from public.products where id = v_item.product_id;
      if v_product.track_stock then
        perform private.apply_inventory_movement(
          p_actor_id, v_refund.school_id, v_product.id, 'refund_return', v_item.quantity,
          null, null, 'refund', v_refund.id,
          'Refund restock', 'refund_return', null
        );
      end if;
    end if;
  end loop;

  select coalesce(sum(refunded_quantity * (line_total_cents / quantity)), 0)::bigint
  into v_refunded_total
  from public.purchase_items
  where purchase_id = v_purchase.id;

  update public.purchases
  set status = case
    when v_refunded_total >= total_cents then 'refunded'::public.purchase_status
    else 'partially_refunded'::public.purchase_status
  end
  where id = v_purchase.id;

  update public.refunds
  set
    status = 'completed',
    ledger_transaction_id = v_tx_id,
    approved_by = coalesce(approved_by, p_actor_id),
    completed_at = now()
  where id = v_refund.id;

  return jsonb_build_object(
    'status', 'completed',
    'refund_id', v_refund.id,
    'amount_cents', v_refund.amount_cents,
    'wallet_balance_after_cents', v_balance_after
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Request refund (full or line items). May auto-complete under threshold.
-- p_lines: [{ "purchase_item_id": uuid, "quantity": int }] — empty = refund all remaining.
-- ---------------------------------------------------------------------------

create or replace function public.pos_request_purchase_refund(
  p_actor_id uuid,
  p_school_id uuid,
  p_purchase_id uuid,
  p_lines jsonb,
  p_reason text,
  p_restock boolean,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.refunds%rowtype;
  v_purchase public.purchases%rowtype;
  v_threshold bigint;
  v_amount bigint := 0;
  v_refund_id uuid;
  v_line jsonb;
  v_pi public.purchase_items%rowtype;
  v_qty int;
  v_auto boolean;
  v_result jsonb;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    return jsonb_build_object('status', 'error', 'failure_code', 'SYSTEM_ERROR');
  end if;

  select * into v_existing
  from public.refunds
  where school_id = p_school_id and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.status = 'completed' then
      return jsonb_build_object(
        'status', 'completed',
        'refund_id', v_existing.id,
        'amount_cents', v_existing.amount_cents
      );
    end if;
    if v_existing.status = 'requested' then
      return jsonb_build_object('status', 'pending_approval', 'refund_id', v_existing.id);
    end if;
  end if;

  select * into v_purchase
  from public.purchases
  where id = p_purchase_id and school_id = p_school_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'failure_code', 'SYSTEM_ERROR');
  end if;

  if v_purchase.status = 'refunded' then
    return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
  end if;

  if trim(p_reason) is null or length(trim(p_reason)) < 3 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'SYSTEM_ERROR');
  end if;

  create temp table _refund_lines (
    purchase_item_id uuid primary key,
    quantity int not null,
    amount_cents bigint not null
  ) on commit drop;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    insert into _refund_lines (purchase_item_id, quantity, amount_cents)
    select
      pi.id,
      pi.quantity - pi.refunded_quantity,
      ((pi.line_total_cents::numeric / pi.quantity) * (pi.quantity - pi.refunded_quantity))::bigint
    from public.purchase_items pi
    where pi.purchase_id = p_purchase_id
      and pi.school_id = p_school_id
      and pi.quantity > pi.refunded_quantity;
  else
    for v_line in select * from jsonb_array_elements(p_lines)
    loop
      v_qty := (v_line->>'quantity')::int;
      select * into v_pi
      from public.purchase_items
      where id = (v_line->>'purchase_item_id')::uuid
        and purchase_id = p_purchase_id
        and school_id = p_school_id;
      if not found or v_qty is null or v_qty <= 0 then
        return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
      end if;
      if v_pi.refunded_quantity + v_qty > v_pi.quantity then
        return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
      end if;
      insert into _refund_lines (purchase_item_id, quantity, amount_cents)
      values (
        v_pi.id,
        v_qty,
        ((v_pi.line_total_cents::numeric / v_pi.quantity) * v_qty)::bigint
      );
    end loop;
  end if;

  select coalesce(sum(amount_cents), 0) into v_amount from _refund_lines;
  if v_amount <= 0 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
  end if;

  select refund_approval_threshold_cents into v_threshold
  from public.school_settings
  where school_id = p_school_id;

  v_threshold := coalesce(v_threshold, 5000);
  v_auto := v_amount <= v_threshold or private.actor_is_school_admin(p_actor_id, p_school_id);

  insert into public.refunds (
    school_id, purchase_id, wallet_id, requested_by, status,
    amount_cents, reason, restock, idempotency_key,
    approved_by
  )
  values (
    p_school_id, p_purchase_id, v_purchase.wallet_id, p_actor_id,
    case when v_auto then 'approved' else 'requested' end,
    v_amount, trim(p_reason), coalesce(p_restock, false), p_idempotency_key,
    case when v_auto then p_actor_id else null end
  )
  returning id into v_refund_id;

  insert into public.refund_items (school_id, refund_id, purchase_item_id, quantity, amount_cents)
  select p_school_id, v_refund_id, purchase_item_id, quantity, amount_cents
  from _refund_lines;

  if not v_auto then
    return jsonb_build_object(
      'status', 'pending_approval',
      'refund_id', v_refund_id,
      'amount_cents', v_amount
    );
  end if;

  v_result := private.complete_purchase_refund(p_actor_id, v_refund_id);
  return v_result || jsonb_build_object('auto_approved', true);
end;
$$;

create or replace function public.school_approve_purchase_refund(
  p_actor_id uuid,
  p_school_id uuid,
  p_refund_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.refunds%rowtype;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  select * into v_refund
  from public.refunds
  where id = p_refund_id and school_id = p_school_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'failure_code', 'SYSTEM_ERROR');
  end if;

  if v_refund.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'refund_id', v_refund.id);
  end if;

  if v_refund.status <> 'requested' then
    return jsonb_build_object('status', 'declined', 'failure_code', 'SYSTEM_ERROR');
  end if;

  update public.refunds
  set status = 'approved', approved_by = p_actor_id
  where id = p_refund_id;

  return private.complete_purchase_refund(p_actor_id, p_refund_id);
end;
$$;

revoke all on function private.complete_purchase_refund(uuid, uuid) from public;
revoke all on function public.pos_request_purchase_refund(uuid, uuid, uuid, jsonb, text, boolean, text) from public;
revoke all on function public.school_approve_purchase_refund(uuid, uuid, uuid) from public;

grant execute on function public.pos_request_purchase_refund(uuid, uuid, uuid, jsonb, text, boolean, text) to service_role;
grant execute on function public.school_approve_purchase_refund(uuid, uuid, uuid) to service_role;
