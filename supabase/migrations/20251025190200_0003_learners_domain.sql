-- 0003: learners, guardians, catalogue, cards (structure)

create table public.learners (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  first_name text not null,
  last_name text not null,
  grade text not null,
  class_name text,
  admission_ref text not null,
  status public.learner_status not null default 'active',
  deactivated_at timestamptz,
  anonymised_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  unique (school_id, admission_ref)
);

create index learners_school_id_idx on public.learners (school_id);

create trigger learners_set_updated_at
before update on public.learners
for each row execute function private.set_updated_at();

create table public.parent_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  learner_id uuid not null,
  invited_email extensions.citext,
  relationship_type public.guardian_relationship not null default 'guardian',
  can_top_up boolean not null default true,
  can_manage_controls boolean not null default true,
  token_hash text not null unique,
  expires_at timestamptz not null,
  status public.parent_invitation_status not null default 'pending',
  failed_attempts int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (school_id, learner_id) references public.learners (school_id, id) on delete restrict
);

create table public.parent_learner_relationships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  learner_id uuid not null,
  parent_id uuid not null references public.profiles (id) on delete restrict,
  relationship_type public.guardian_relationship not null default 'guardian',
  status public.guardian_link_status not null default 'pending_approval',
  can_top_up boolean not null default true,
  can_manage_controls boolean not null default true,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (learner_id, parent_id),
  foreign key (school_id, learner_id) references public.learners (school_id, id) on delete restrict
);

create index plr_parent_active_idx on public.parent_learner_relationships (parent_id) where status = 'active';

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  name text not null,
  sort_order int not null default 0,
  colour text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, id)
);

create unique index product_categories_school_name_uidx
on public.product_categories (school_id, lower(name));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  category_id uuid not null,
  name text not null,
  description text,
  barcode text,
  price_cents bigint not null check (price_cents >= 0),
  cost_price_cents bigint check (cost_price_cents is null or cost_price_cents >= 0),
  image_path text,
  track_stock boolean not null default false,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  foreign key (school_id, category_id) references public.product_categories (school_id, id) on delete restrict
);

create unique index products_school_barcode_uidx
on public.products (school_id, barcode)
where barcode is not null and archived_at is null;

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create table public.nfc_cards (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  learner_id uuid,
  credential_scheme public.credential_scheme not null,
  credential_reference text not null unique,
  key_version int not null default 1,
  last_read_counter bigint not null default 0,
  card_number text,
  card_status public.card_status not null default 'unassigned',
  status_reason text,
  replaced_by_card_id uuid references public.nfc_cards (id) on delete set null,
  issued_at timestamptz not null default now(),
  activated_at timestamptz,
  deactivated_at timestamptz,
  expires_at timestamptz,
  last_used_at timestamptz,
  unique (school_id, id),
  foreign key (school_id, learner_id) references public.learners (school_id, id) on delete restrict
);

create unique index nfc_cards_one_active_per_learner
on public.nfc_cards (learner_id)
where card_status = 'active' and learner_id is not null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  learner_id uuid,
  category public.notification_category not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  is_essential boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  learner_id uuid,
  category public.notification_category not null,
  channel text not null,
  enabled boolean not null default true,
  threshold_cents bigint,
  unique nulls not distinct (user_id, learner_id, category, channel)
);
