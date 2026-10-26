-- 0009: Phase 5 — ledger posting primitive, wallet credit/debit, pilot funding, reconciliation

-- ---------------------------------------------------------------------------
-- School-level ledger accounts (one per type per school; wallet accounts already exist)
-- ---------------------------------------------------------------------------

create or replace function private.ensure_school_ledger_account(
  p_school_id uuid,
  p_account_type public.ledger_account_type,
  p_normal_side public.ledger_side,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.ledger_accounts
  where school_id = p_school_id
    and account_type = p_account_type
    and wallet_id is null;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.ledger_accounts (school_id, account_type, wallet_id, normal_side, name)
  values (p_school_id, p_account_type, null, p_normal_side, p_name)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Double-entry primitive (service_role only; callers re-validate actors)
-- ---------------------------------------------------------------------------

create or replace function private.post_ledger_transaction(
  p_school_id uuid,
  p_transaction_type public.ledger_transaction_type,
  p_idempotency_key text,
  p_description text,
  p_created_by uuid,
  p_reference_type text,
  p_reference_id uuid,
  p_reverses_transaction_id uuid,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_tx_id uuid;
  v_entry jsonb;
  v_account_id uuid;
  v_direction public.ledger_entry_direction;
  v_amount bigint;
  v_debit_total bigint := 0;
  v_credit_total bigint := 0;
  v_wallet_account uuid;
  v_delta bigint;
  v_rows int;
begin
  if p_school_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'invalid_idempotency';
  end if;

  select id into v_existing
  from public.ledger_transactions
  where school_id = p_school_id
    and idempotency_key = p_idempotency_key;

  if v_existing is not null then
    return v_existing;
  end if;

  if p_reverses_transaction_id is not null then
    if exists (
      select 1 from public.ledger_transactions t
      where t.reverses_transaction_id = p_reverses_transaction_id
    ) then
      raise exception 'already_reversed';
    end if;
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 2 then
    raise exception 'invalid_entries';
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_account_id := (v_entry->>'account_id')::uuid;
    v_direction := (v_entry->>'direction')::public.ledger_entry_direction;
    v_amount := (v_entry->>'amount_cents')::bigint;

    if v_amount is null or v_amount <= 0 then
      raise exception 'invalid_amount';
    end if;

    if not exists (
      select 1 from public.ledger_accounts la
      where la.id = v_account_id
        and (la.school_id = p_school_id or la.school_id is null)
    ) then
      raise exception 'invalid_account';
    end if;

    if v_direction = 'debit' then
      v_debit_total := v_debit_total + v_amount;
    elsif v_direction = 'credit' then
      v_credit_total := v_credit_total + v_amount;
    else
      raise exception 'invalid_direction';
    end if;
  end loop;

  if v_debit_total <> v_credit_total then
    raise exception 'unbalanced_transaction';
  end if;

  insert into public.ledger_transactions (
    school_id,
    transaction_type,
    idempotency_key,
    reference_type,
    reference_id,
    reverses_transaction_id,
    description,
    created_by
  )
  values (
    p_school_id,
    p_transaction_type,
    p_idempotency_key,
    p_reference_type,
    p_reference_id,
    p_reverses_transaction_id,
    p_description,
    p_created_by
  )
  returning id into v_tx_id;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.ledger_entries (
      ledger_transaction_id,
      school_id,
      account_id,
      direction,
      amount_cents
    )
    values (
      v_tx_id,
      p_school_id,
      (v_entry->>'account_id')::uuid,
      (v_entry->>'direction')::public.ledger_entry_direction,
      (v_entry->>'amount_cents')::bigint
    );

  end loop;

  for v_wallet_account in
    select distinct w.ledger_account_id
    from public.wallets w
    where w.ledger_account_id in (
      select (e->>'account_id')::uuid from jsonb_array_elements(p_entries) e
    )
  loop
    select coalesce(sum(
      case when le.direction = 'credit' then le.amount_cents else -le.amount_cents end
    ), 0)
    into v_delta
    from public.ledger_entries le
    where le.ledger_transaction_id = v_tx_id
      and le.account_id = v_wallet_account;

    update public.wallets w
    set balance_cents = w.balance_cents + v_delta
    where w.ledger_account_id = v_wallet_account
      and w.balance_cents + v_delta >= 0;

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'insufficient_funds';
    end if;
  end loop;

  return v_tx_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pilot / adjustment credit (school admin) — Dr adjustments / Cr wallet_liability
-- ---------------------------------------------------------------------------

create or replace function public.pilot_fund_wallet(
  p_actor_id uuid,
  p_wallet_id uuid,
  p_amount_cents bigint,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_adj uuid;
  v_entries jsonb;
  v_tx_id uuid;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_wallet
  from public.wallets
  where id = p_wallet_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  perform private.assert_actor_school_admin(p_actor_id, v_wallet.school_id);

  if exists (select 1 from public.schools s where s.id = v_wallet.school_id and s.status <> 'active') then
    raise exception 'school_not_active';
  end if;

  v_adj := private.ensure_school_ledger_account(
    v_wallet.school_id, 'adjustments', 'debit', 'Adjustments'
  );

  v_entries := jsonb_build_array(
    jsonb_build_object('account_id', v_adj, 'direction', 'debit', 'amount_cents', p_amount_cents),
    jsonb_build_object(
      'account_id', v_wallet.ledger_account_id,
      'direction', 'credit',
      'amount_cents', p_amount_cents
    )
  );

  v_tx_id := private.post_ledger_transaction(
    v_wallet.school_id,
    'adjustment',
    p_idempotency_key,
    coalesce(nullif(trim(p_reason), ''), 'Pilot wallet credit'),
    p_actor_id,
    'wallet',
    v_wallet.id,
    null,
    v_entries
  );

  perform private.write_audit_log(
    p_actor_id, 'school_admin', v_wallet.school_id, 'wallet.pilot_fund', 'wallet', v_wallet.id, 'success',
    jsonb_build_object('amount_cents', p_amount_cents, 'ledger_transaction_id', v_tx_id)
  );

  select balance_cents into v_wallet.balance_cents from public.wallets where id = p_wallet_id;

  return jsonb_build_object(
    'ledger_transaction_id', v_tx_id,
    'wallet_id', v_wallet.id,
    'balance_cents', v_wallet.balance_cents
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Wallet debit (purchase primitive) — Dr wallet_liability / Cr school_sales
-- ---------------------------------------------------------------------------

create or replace function public.debit_wallet_ledger(
  p_actor_id uuid,
  p_wallet_id uuid,
  p_amount_cents bigint,
  p_idempotency_key text,
  p_description text,
  p_reference_type text,
  p_reference_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_sales uuid;
  v_entries jsonb;
  v_tx_id uuid;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_wallet from public.wallets where id = p_wallet_id for update;
  if not found then raise exception 'wallet_not_found'; end if;

  perform private.assert_actor_school_admin(p_actor_id, v_wallet.school_id);

  if v_wallet.status <> 'active' then
    raise exception 'wallet_frozen';
  end if;

  v_sales := private.ensure_school_ledger_account(
    v_wallet.school_id, 'school_sales', 'credit', 'Tuck shop sales'
  );

  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_id', v_wallet.ledger_account_id,
      'direction', 'debit',
      'amount_cents', p_amount_cents
    ),
    jsonb_build_object('account_id', v_sales, 'direction', 'credit', 'amount_cents', p_amount_cents)
  );

  v_tx_id := private.post_ledger_transaction(
    v_wallet.school_id,
    'purchase',
    p_idempotency_key,
    p_description,
    p_actor_id,
    p_reference_type,
    p_reference_id,
    null,
    v_entries
  );

  select balance_cents into v_wallet.balance_cents from public.wallets where id = p_wallet_id;

  return jsonb_build_object(
    'ledger_transaction_id', v_tx_id,
    'balance_cents', v_wallet.balance_cents
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reconciliation (wallet projection vs ledger entries)
-- ---------------------------------------------------------------------------

create or replace function public.run_reconciliation(p_actor_id uuid, p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_mismatch int := 0;
  v_ledger_unbalanced boolean := false;
  v_debits bigint;
  v_credits bigint;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  select count(*) into v_wallet_mismatch
  from public.wallets w
  where w.school_id = p_school_id
    and w.balance_cents <> coalesce((
      select sum(case when le.direction = 'credit' then le.amount_cents else -le.amount_cents end)
      from public.ledger_entries le
      where le.account_id = w.ledger_account_id
    ), 0);

  select
    coalesce(sum(case when le.direction = 'debit' then le.amount_cents else 0 end), 0),
    coalesce(sum(case when le.direction = 'credit' then le.amount_cents else 0 end), 0)
  into v_debits, v_credits
  from public.ledger_entries le
  where le.school_id = p_school_id;

  v_ledger_unbalanced := v_debits <> v_credits;

  return jsonb_build_object(
    'school_id', p_school_id,
    'wallet_projection_mismatches', v_wallet_mismatch,
    'ledger_debits_cents', v_debits,
    'ledger_credits_cents', v_credits,
    'ledger_balanced', not v_ledger_unbalanced,
    'ok', v_wallet_mismatch = 0 and not v_ledger_unbalanced
  );
end;
$$;

revoke all on function private.ensure_school_ledger_account(uuid, public.ledger_account_type, public.ledger_side, text) from public;
revoke all on function private.post_ledger_transaction(uuid, public.ledger_transaction_type, text, text, uuid, text, uuid, uuid, jsonb) from public;
revoke all on function public.pilot_fund_wallet(uuid, uuid, bigint, text, text) from public;
revoke all on function public.debit_wallet_ledger(uuid, uuid, bigint, text, text, text, uuid) from public;
revoke all on function public.run_reconciliation(uuid, uuid) from public;

grant execute on function public.pilot_fund_wallet(uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.debit_wallet_ledger(uuid, uuid, bigint, text, text, text, uuid) to service_role;
grant execute on function public.run_reconciliation(uuid, uuid) to service_role;
