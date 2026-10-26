-- 0011: Phase 7 — POS devices, shifts, checkout RPCs

-- ---------------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------------

create table public.pos_devices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  registered_by uuid references public.profiles (id) on delete set null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, id)
);

create type public.shift_status as enum ('open', 'closed');

create table public.cashier_shifts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  cashier_id uuid not null references public.profiles (id) on delete restrict,
  pos_device_id uuid,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status public.shift_status not null default 'open',
  sales_count int not null default 0 check (sales_count >= 0),
  sales_total_cents bigint not null default 0 check (sales_total_cents >= 0),
  notes text,
  unique (school_id, id),
  foreign key (school_id, pos_device_id) references public.pos_devices (school_id, id) on delete set null
);

create index cashier_shifts_open_idx
  on public.cashier_shifts (school_id, cashier_id)
  where status = 'open';

create table public.purchase_attempts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  idempotency_key text not null,
  outcome text not null check (outcome in ('declined', 'error', 'timeout_unknown')),
  failure_code text not null,
  card_id uuid references public.nfc_cards (id) on delete set null,
  learner_id uuid,
  cashier_id uuid not null references public.profiles (id) on delete restrict,
  pos_device_id uuid,
  total_cents bigint,
  created_at timestamptz not null default now()
);

create index purchase_attempts_school_created_idx
  on public.purchase_attempts (school_id, created_at desc);

create table private.school_receipt_counters (
  school_id uuid primary key references public.schools (id) on delete restrict,
  last_receipt bigint not null default 0
);

alter table public.purchases
  add column if not exists card_id uuid references public.nfc_cards (id) on delete set null,
  add column if not exists shift_id uuid,
  add column if not exists pos_device_id uuid,
  add column if not exists request_hash text,
  add column if not exists ledger_transaction_id uuid references public.ledger_transactions (id) on delete set null;

alter table public.purchases
  add constraint purchases_shift_fk
  foreign key (school_id, shift_id) references public.cashier_shifts (school_id, id) on delete set null;

alter table public.purchases
  add constraint purchases_pos_device_fk
  foreign key (school_id, pos_device_id) references public.pos_devices (school_id, id) on delete set null;

create policy purchase_items_select_cashier on public.purchase_items
for select to authenticated
using (
  exists (
    select 1 from public.purchases p
    where p.id = purchase_items.purchase_id
      and p.cashier_id = auth.uid()
  )
);

alter table public.pos_devices enable row level security;
alter table public.pos_devices force row level security;
alter table public.cashier_shifts enable row level security;
alter table public.cashier_shifts force row level security;
alter table public.purchase_attempts enable row level security;
alter table public.purchase_attempts force row level security;

create policy pos_devices_select_staff on public.pos_devices
for select to authenticated
using (private.is_school_staff(school_id) or private.is_school_admin(school_id));

create policy cashier_shifts_select_own on public.cashier_shifts
for select to authenticated
using (cashier_id = auth.uid() or private.is_school_admin(school_id));

create policy purchase_attempts_select_staff on public.purchase_attempts
for select to authenticated
using (cashier_id = auth.uid() or private.is_school_admin(school_id));

revoke insert, update, delete on public.pos_devices from authenticated;
revoke insert, update, delete on public.cashier_shifts from authenticated;
revoke all on public.purchase_attempts from authenticated;
grant select on public.purchase_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- Actor + receipt helpers
-- ---------------------------------------------------------------------------

create or replace function private.assert_actor_pos(p_actor_id uuid, p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is null or p_school_id is null then
    raise exception 'NOT_AUTHORISED';
  end if;
  if not exists (
    select 1
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id
    join public.schools s on s.id = ra.school_id
    where ra.user_id = p_actor_id
      and ra.school_id = p_school_id
      and ra.role in ('cashier', 'school_admin')
      and ra.status = 'active'
      and p.status = 'active'
      and s.status = 'active'
  ) then
    raise exception 'NOT_AUTHORISED';
  end if;
end;
$$;

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

create or replace function private.next_receipt_number(p_school_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  insert into private.school_receipt_counters (school_id, last_receipt)
  values (p_school_id, 1)
  on conflict (school_id) do update
    set last_receipt = private.school_receipt_counters.last_receipt + 1
  returning last_receipt into v;
  return v;
end;
$$;

create or replace function private.learner_spent_cents(
  p_school_id uuid,
  p_learner_id uuid,
  p_window text
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  with tz as (
    select coalesce(s.timezone, 'Africa/Johannesburg') as tz
    from public.schools s
    where s.id = p_school_id
  )
  select coalesce(sum(p.total_cents), 0)::bigint
  from public.purchases p, tz
  where p.school_id = p_school_id
    and p.learner_id = p_learner_id
    and p.status = 'completed'
    and (
      (p_window = 'day' and (p.created_at at time zone tz.tz)::date = (now() at time zone tz.tz)::date)
      or (
        p_window = 'week'
        and (p.created_at at time zone tz.tz)::date >= (
          (now() at time zone tz.tz)::date
          - extract(dow from (now() at time zone tz.tz)::timestamp)::int
        )
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Device + shift RPCs
-- ---------------------------------------------------------------------------

create or replace function public.pos_ensure_device(
  p_actor_id uuid,
  p_school_id uuid,
  p_device_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(p_device_name);
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);
  if v_name is null or length(v_name) < 2 then
    raise exception 'invalid_device_name';
  end if;

  select id into v_id
  from public.pos_devices
  where school_id = p_school_id
    and lower(name) = lower(v_name);

  if v_id is null then
    insert into public.pos_devices (school_id, name, registered_by, last_seen_at)
    values (p_school_id, v_name, p_actor_id, now())
    returning id into v_id;
  else
    update public.pos_devices set last_seen_at = now() where id = v_id;
  end if;

  return jsonb_build_object('pos_device_id', v_id, 'name', v_name);
end;
$$;

create or replace function public.pos_open_shift(
  p_actor_id uuid,
  p_school_id uuid,
  p_pos_device_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_id uuid;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);

  if exists (
    select 1 from public.cashier_shifts
    where school_id = p_school_id
      and cashier_id = p_actor_id
      and status = 'open'
  ) then
    raise exception 'shift_already_open';
  end if;

  if p_pos_device_id is not null and not exists (
    select 1 from public.pos_devices d
    where d.id = p_pos_device_id and d.school_id = p_school_id and d.status = 'active'
  ) then
    raise exception 'invalid_device';
  end if;

  insert into public.cashier_shifts (school_id, cashier_id, pos_device_id, status)
  values (p_school_id, p_actor_id, p_pos_device_id, 'open')
  returning id into v_shift_id;

  return jsonb_build_object('shift_id', v_shift_id);
end;
$$;

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

create or replace function public.pos_log_purchase_attempt(
  p_actor_id uuid,
  p_school_id uuid,
  p_idempotency_key text,
  p_outcome text,
  p_failure_code text,
  p_card_id uuid,
  p_learner_id uuid,
  p_pos_device_id uuid,
  p_total_cents bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);
  insert into public.purchase_attempts (
    school_id, idempotency_key, outcome, failure_code,
    card_id, learner_id, cashier_id, pos_device_id, total_cents
  )
  values (
    p_school_id, p_idempotency_key, p_outcome, p_failure_code,
    p_card_id, p_learner_id, p_actor_id, p_pos_device_id, p_total_cents
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Checkout (preview + commit + status)
-- ---------------------------------------------------------------------------

create or replace function public.pos_preview_checkout(
  p_actor_id uuid,
  p_school_id uuid,
  p_credential_reference text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred text := lower(trim(p_credential_reference));
  v_card public.nfc_cards%rowtype;
  v_learner public.learners%rowtype;
  v_wallet public.wallets%rowtype;
  v_total bigint := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
  v_spent_day bigint;
  v_spent_week bigint;
  v_limits public.spending_limits%rowtype;
  v_checks jsonb := '[]'::jsonb;
  v_ok boolean := true;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);

  if v_cred is null or length(v_cred) < 4 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'INVALID_CREDENTIAL');
  end if;

  select * into v_card from public.nfc_cards where credential_reference = v_cred and school_id = p_school_id;
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

  select * into v_wallet from public.wallets where learner_id = v_learner.id and school_id = p_school_id;
  if not found then
    return jsonb_build_object('status', 'declined', 'failure_code', 'SYSTEM_ERROR');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
  end if;

  if jsonb_array_length(p_items) > 50 then
    return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty <= 0 or v_qty > 99 then
      return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
    end if;
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and school_id = p_school_id
      and is_active
      and archived_at is null;
    if not found then
      return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
    end if;
    if v_product.track_stock and v_product.stock_quantity < v_qty then
      return jsonb_build_object('status', 'declined', 'failure_code', 'INSUFFICIENT_STOCK');
    end if;
    v_total := v_total + v_product.price_cents * v_qty;
    if v_total > 100000000 or v_total <= 0 then
      return jsonb_build_object('status', 'declined', 'failure_code', 'PRODUCT_UNAVAILABLE');
    end if;
  end loop;

  if v_wallet.status <> 'active' then
    v_ok := false;
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('code', 'WALLET_FROZEN', 'ok', false));
  end if;

  if v_wallet.balance_cents < v_total then
    v_ok := false;
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('code', 'INSUFFICIENT_FUNDS', 'ok', false));
  else
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('code', 'INSUFFICIENT_FUNDS', 'ok', true));
  end if;

  select * into v_limits from public.spending_limits where learner_id = v_learner.id and school_id = p_school_id;
  if found then
    v_spent_day := private.learner_spent_cents(p_school_id, v_learner.id, 'day');
    v_spent_week := private.learner_spent_cents(p_school_id, v_learner.id, 'week');
    if v_limits.daily_limit_cents is not null and v_spent_day + v_total > v_limits.daily_limit_cents then
      v_ok := false;
      v_checks := v_checks || jsonb_build_array(jsonb_build_object('code', 'LIMIT_EXCEEDED', 'ok', false, 'window', 'day'));
    end if;
    if v_limits.weekly_limit_cents is not null and v_spent_week + v_total > v_limits.weekly_limit_cents then
      v_ok := false;
      v_checks := v_checks || jsonb_build_array(jsonb_build_object('code', 'LIMIT_EXCEEDED', 'ok', false, 'window', 'week'));
    end if;
  end if;

  return jsonb_build_object(
    'status', case when v_ok then 'ready' else 'declined' end,
    'failure_code', case when v_ok then null else 'CHECK_FAILED' end,
    'learner', jsonb_build_object(
      'id', v_learner.id,
      'display_name', v_learner.first_name || ' ' || left(v_learner.last_name, 1) || '.',
      'grade', v_learner.grade
    ),
    'wallet_balance_cents', v_wallet.balance_cents,
    'total_cents', v_total,
    'checks', v_checks,
    'card_id', v_card.id
  );
end;
$$;

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

create or replace function public.pos_get_purchase_status(
  p_actor_id uuid,
  p_school_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.purchases%rowtype;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);

  select * into v_p
  from public.purchases
  where school_id = p_school_id and idempotency_key = p_idempotency_key;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object(
    'status', 'completed',
    'purchase_id', v_p.id,
    'receipt_number', v_p.receipt_number,
    'total_cents', v_p.total_cents,
    'wallet_balance_after_cents', v_p.wallet_balance_after_cents
  );
end;
$$;

revoke all on function private.assert_actor_pos(uuid, uuid) from public;
revoke all on function private.actor_is_school_admin(uuid, uuid) from public;
revoke all on function private.next_receipt_number(uuid) from public;
revoke all on function private.learner_spent_cents(uuid, uuid, text) from public;

revoke all on function public.pos_ensure_device(uuid, uuid, text) from public;
revoke all on function public.pos_open_shift(uuid, uuid, uuid) from public;
revoke all on function public.pos_close_shift(uuid, uuid, text) from public;
revoke all on function public.pos_log_purchase_attempt(uuid, uuid, text, text, text, uuid, uuid, uuid, bigint) from public;
revoke all on function public.pos_preview_checkout(uuid, uuid, text, jsonb) from public;
revoke all on function public.pos_checkout(uuid, uuid, text, text, text, jsonb, uuid, uuid) from public;
revoke all on function public.pos_get_purchase_status(uuid, uuid, text) from public;

grant execute on function public.pos_ensure_device(uuid, uuid, text) to service_role;
grant execute on function public.pos_open_shift(uuid, uuid, uuid) to service_role;
grant execute on function public.pos_close_shift(uuid, uuid, text) to service_role;
grant execute on function public.pos_log_purchase_attempt(uuid, uuid, text, text, text, uuid, uuid, uuid, bigint) to service_role;
grant execute on function public.pos_preview_checkout(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.pos_checkout(uuid, uuid, text, text, text, jsonb, uuid, uuid) to service_role;
grant execute on function public.pos_get_purchase_status(uuid, uuid, text) to service_role;
