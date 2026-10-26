-- 0004: wallets, ledger, purchases (schema + immutability guards)

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools (id) on delete restrict,
  account_type public.ledger_account_type not null,
  wallet_id uuid,
  normal_side public.ledger_side not null,
  name text not null,
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  created_at timestamptz not null default now()
);

create unique index ledger_accounts_school_type_uidx
on public.ledger_accounts (school_id, account_type)
where wallet_id is null;

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  learner_id uuid not null,
  status public.wallet_status not null default 'active',
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  ledger_account_id uuid not null unique references public.ledger_accounts (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  unique (learner_id),
  foreign key (school_id, learner_id) references public.learners (school_id, id) on delete restrict
);

create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function private.set_updated_at();

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  transaction_type public.ledger_transaction_type not null,
  idempotency_key text not null,
  reference_type text,
  reference_id uuid,
  reverses_transaction_id uuid unique references public.ledger_transactions (id) on delete restrict,
  description text,
  effective_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (school_id, idempotency_key)
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  ledger_transaction_id uuid not null references public.ledger_transactions (id) on delete restrict,
  school_id uuid not null references public.schools (id) on delete restrict,
  account_id uuid not null references public.ledger_accounts (id) on delete restrict,
  direction public.ledger_entry_direction not null,
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create or replace function private.ledger_entries_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'ledger_entries are append-only';
end;
$$;

create trigger ledger_entries_no_update
before update or delete on public.ledger_entries
for each row execute function private.ledger_entries_block_mutations();

create table public.wallet_top_ups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  wallet_id uuid not null,
  learner_id uuid not null,
  parent_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  status public.top_up_status not null default 'pending',
  source text not null default 'manual',
  provider public.payment_provider,
  provider_checkout_ref text,
  provider_payment_id text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, idempotency_key),
  unique (provider, provider_payment_id),
  foreign key (school_id, wallet_id) references public.wallets (school_id, id) on delete restrict
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  receipt_number bigint not null,
  wallet_id uuid not null,
  learner_id uuid not null,
  card_id uuid,
  cashier_id uuid not null references public.profiles (id) on delete restrict,
  total_cents bigint not null check (total_cents > 0),
  wallet_balance_after_cents bigint not null,
  status public.purchase_status not null default 'completed',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (school_id, id),
  unique (school_id, idempotency_key),
  unique (school_id, receipt_number),
  foreign key (school_id, wallet_id) references public.wallets (school_id, id) on delete restrict
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  purchase_id uuid not null,
  product_id uuid,
  product_name text not null,
  category_name text,
  unit_price_cents bigint not null,
  quantity int not null check (quantity > 0),
  line_total_cents bigint not null,
  foreign key (school_id, purchase_id) references public.purchases (school_id, id) on delete restrict
);

revoke update, delete on public.ledger_transactions from anon, authenticated;
revoke update, delete on public.ledger_entries from anon, authenticated;
