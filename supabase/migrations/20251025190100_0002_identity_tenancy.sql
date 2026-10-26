-- 0002: identity, tenancy, platform

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  first_name text not null default '',
  last_name text not null default '',
  email extensions.citext not null unique,
  phone text,
  status public.profile_status not null default 'active',
  privacy_notice_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value)
values ('environment', '{"env": "development"}'::jsonb)
on conflict (key) do nothing;

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  pricing_model text not null,
  billing_interval text not null default 'month',
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_code text not null unique,
  address text,
  province public.sa_province,
  contact_email text,
  contact_phone text,
  logo_url text,
  status public.school_status not null default 'pending',
  status_reason text,
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles (id) on delete set null,
  subscription_plan_id uuid references public.subscription_plans (id) on delete set null,
  timezone text not null default 'Africa/Johannesburg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_code)
);

create trigger schools_set_updated_at
before update on public.schools
for each row execute function private.set_updated_at();

create table public.school_settings (
  school_id uuid primary key references public.schools (id) on delete restrict,
  topup_min_cents bigint not null default 5000 check (topup_min_cents >= 0),
  topup_max_cents bigint not null default 5000000 check (topup_max_cents > 0),
  topup_presets_cents bigint[] not null default array[5000, 10000, 20000, 50000],
  low_balance_default_cents bigint not null default 5000,
  custody_model public.custody_model not null default 'school_merchant',
  payment_provider public.payment_provider,
  payments_enabled boolean not null default false,
  allow_uid_only_cards boolean not null default false,
  allow_simulated_cards boolean not null default false,
  product_restrictions_enabled boolean not null default false,
  require_open_shift boolean not null default true,
  refund_approval_threshold_cents bigint not null default 5000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger school_settings_set_updated_at
before update on public.school_settings
for each row execute function private.set_updated_at();

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  role public.app_role not null,
  school_id uuid references public.schools (id) on delete restrict,
  permissions text[] not null default '{}',
  status public.role_assignment_status not null default 'active',
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint role_assignments_school_required check (
    (role in ('cashier', 'school_admin') and school_id is not null)
    or (role in ('parent', 'super_admin') and school_id is null)
  )
);

create unique index role_assignments_user_role_school_uidx
on public.role_assignments (user_id, role, coalesce(school_id, private.nil_school_id()));

create index role_assignments_user_id_idx on public.role_assignments (user_id);
create index role_assignments_school_id_idx on public.role_assignments (school_id) where school_id is not null;

create trigger role_assignments_set_updated_at
before update on public.role_assignments
for each row execute function private.set_updated_at();

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  email extensions.citext not null,
  role public.app_role not null check (role in ('cashier', 'school_admin')),
  permissions text[] not null default '{}',
  token_hash text not null unique,
  expires_at timestamptz not null,
  status text not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.school_payment_credentials (
  school_id uuid not null references public.schools (id) on delete restrict,
  provider public.payment_provider not null,
  encrypted_payload bytea not null,
  key_version int not null default 1,
  status text not null default 'active',
  rotated_at timestamptz,
  primary key (school_id, provider)
);

revoke all on table public.school_payment_credentials from anon, authenticated;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.app_role,
  school_id uuid references public.schools (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  outcome public.audit_outcome not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  ip_hash text
);

create index audit_logs_school_occurred_idx on public.audit_logs (school_id, occurred_at desc);
