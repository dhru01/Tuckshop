-- 0001: extensions, schemas, enums, shared utilities

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- Sentinel UUID for unique constraints involving nullable school_id
create or replace function private.nil_school_id() returns uuid
language sql immutable parallel safe
as $$ select '00000000-0000-0000-0000-000000000000'::uuid $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.profile_status as enum ('active', 'disabled');
create type public.school_status as enum ('pending', 'active', 'suspended', 'deactivated');
create type public.sa_province as enum (
  'eastern_cape', 'free_state', 'gauteng', 'kwazulu_natal', 'limpopo',
  'mpumalanga', 'northern_cape', 'north_west', 'western_cape'
);
create type public.app_role as enum ('parent', 'cashier', 'school_admin', 'super_admin');
create type public.role_assignment_status as enum ('invited', 'active', 'disabled');
create type public.custody_model as enum ('school_merchant', 'platform_pooled', 'provider_split');
create type public.payment_provider as enum ('payfast', 'yoco');
create type public.learner_status as enum ('active', 'inactive', 'left');
create type public.guardian_relationship as enum ('mother', 'father', 'guardian', 'other');
create type public.parent_invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.guardian_link_status as enum ('pending_approval', 'active', 'revoked');
create type public.credential_scheme as enum ('simulated', 'uid_only', 'ntag424_sdm', 'desfire_ev3');
create type public.card_status as enum (
  'unassigned', 'active', 'frozen', 'lost', 'stolen', 'replaced', 'deactivated'
);
create type public.wallet_status as enum ('active', 'frozen', 'closed');
create type public.ledger_account_type as enum (
  'wallet_liability', 'provider_clearing', 'settled_funds', 'school_sales',
  'provider_fees', 'adjustments', 'suspense', 'platform_fees'
);
create type public.ledger_side as enum ('debit', 'credit');
create type public.ledger_entry_direction as enum ('debit', 'credit');
create type public.ledger_transaction_type as enum (
  'top_up', 'purchase', 'purchase_refund', 'top_up_reversal', 'adjustment', 'fee', 'settlement', 'reversal'
);
create type public.top_up_status as enum (
  'pending', 'redirected', 'succeeded', 'failed', 'cancelled', 'expired', 'reversed'
);
create type public.purchase_status as enum ('completed', 'partially_refunded', 'refunded');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'completed');
create type public.notification_category as enum (
  'topup_succeeded', 'topup_failed', 'low_balance', 'card_frozen', 'card_replaced',
  'auto_topup_failed', 'refund_completed', 'purchase', 'system'
);
create type public.audit_outcome as enum ('success', 'denied', 'error');

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
