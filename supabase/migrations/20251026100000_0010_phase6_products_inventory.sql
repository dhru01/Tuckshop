-- 0010: Phase 6 — product catalogue RPCs, inventory movements, category seeding

-- ---------------------------------------------------------------------------
-- Inventory movement log (append-only; stock_quantity is a projection)
-- ---------------------------------------------------------------------------

create type public.inventory_movement_type as enum (
  'initial', 'sale', 'refund_return', 'restock', 'adjustment', 'write_off'
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  product_id uuid not null,
  movement_type public.inventory_movement_type not null,
  quantity_delta int not null check (quantity_delta <> 0),
  quantity_after int not null check (quantity_after >= 0),
  unit_cost_cents bigint check (unit_cost_cents is null or unit_cost_cents >= 0),
  supplier text,
  reference_type text,
  reference_id uuid,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  unique (school_id, id),
  foreign key (school_id, product_id) references public.products (school_id, id) on delete restrict
);

create index inventory_movements_product_idx
  on public.inventory_movements (school_id, product_id, created_at desc);

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  product_id uuid not null,
  quantity_delta int not null check (quantity_delta <> 0),
  reason_code text not null,
  notes text,
  adjusted_by uuid not null references public.profiles (id) on delete restrict,
  inventory_movement_id uuid not null references public.inventory_movements (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (school_id, id),
  foreign key (school_id, product_id) references public.products (school_id, id) on delete restrict
);

create or replace function private.inventory_movements_block_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'inventory_movements are append-only';
end;
$$;

create trigger inventory_movements_no_update
before update or delete on public.inventory_movements
for each row execute function private.inventory_movements_block_mutations();

alter table public.inventory_movements enable row level security;
alter table public.inventory_movements force row level security;

alter table public.stock_adjustments enable row level security;
alter table public.stock_adjustments force row level security;

create policy inventory_movements_select_staff on public.inventory_movements
for select to authenticated
using (private.is_school_admin(school_id) or private.is_school_staff(school_id));

create policy stock_adjustments_select_admin on public.stock_adjustments
for select to authenticated
using (private.is_school_admin(school_id));

create policy products_select_admin on public.products
for select to authenticated
using (private.is_school_admin(school_id));

revoke insert, update, delete on public.products from authenticated;
revoke insert, update, delete on public.product_categories from authenticated;
revoke all on public.inventory_movements from authenticated;
revoke all on public.stock_adjustments from authenticated;

grant select on public.inventory_movements to authenticated;
grant select on public.stock_adjustments to authenticated;

-- ---------------------------------------------------------------------------
-- Default categories per school
-- ---------------------------------------------------------------------------

create or replace function private.seed_default_product_categories(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.product_categories (school_id, name, sort_order, colour, is_active)
  select p_school_id, d.name, d.sort_order, d.colour, true
  from (
    values
      ('Food', 10, '#16a34a'),
      ('Snacks', 20, '#ca8a04'),
      ('Drinks', 30, '#2563eb'),
      ('Stationery', 40, '#7c3aed'),
      ('Other', 50, '#64748b')
  ) as d(name, sort_order, colour)
  where not exists (
    select 1
    from public.product_categories c
    where c.school_id = p_school_id
      and lower(c.name) = lower(d.name)
  );
end;
$$;

-- Backfill existing schools
do $$
declare
  r record;
begin
  for r in select id from public.schools
  loop
    perform private.seed_default_product_categories(r.id);
  end loop;
end;
$$;

create or replace function public.ensure_school_product_categories(p_actor_id uuid, p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);
  perform private.seed_default_product_categories(p_school_id);

  return jsonb_build_object(
    'school_id', p_school_id,
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'sort_order', c.sort_order,
        'colour', c.colour,
        'is_active', c.is_active
      ) order by c.sort_order, c.name), '[]'::jsonb)
      from public.product_categories c
      where c.school_id = p_school_id
        and c.is_active
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal: apply stock movement and update projection
-- ---------------------------------------------------------------------------

create or replace function private.apply_inventory_movement(
  p_actor_id uuid,
  p_school_id uuid,
  p_product_id uuid,
  p_movement_type public.inventory_movement_type,
  p_quantity_delta int,
  p_unit_cost_cents bigint,
  p_supplier text,
  p_reference_type text,
  p_reference_id uuid,
  p_reason text,
  p_reason_code text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_after int;
  v_movement_id uuid;
  v_adj_id uuid;
begin
  if p_quantity_delta = 0 then
    raise exception 'invalid_quantity';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and school_id = p_school_id
  for update;

  if not found then
    raise exception 'product_not_found';
  end if;

  if v_product.archived_at is not null then
    raise exception 'product_archived';
  end if;

  if not v_product.track_stock then
    raise exception 'stock_not_tracked';
  end if;

  v_after := v_product.stock_quantity + p_quantity_delta;
  if v_after < 0 then
    raise exception 'insufficient_stock';
  end if;

  insert into public.inventory_movements (
    school_id,
    product_id,
    movement_type,
    quantity_delta,
    quantity_after,
    unit_cost_cents,
    supplier,
    reference_type,
    reference_id,
    actor_id,
    reason
  )
  values (
    p_school_id,
    p_product_id,
    p_movement_type,
    p_quantity_delta,
    v_after,
    p_unit_cost_cents,
    p_supplier,
    p_reference_type,
    p_reference_id,
    p_actor_id,
    p_reason
  )
  returning id into v_movement_id;

  update public.products
  set stock_quantity = v_after
  where id = p_product_id;

  if p_movement_type in ('adjustment', 'write_off', 'restock') then
    insert into public.stock_adjustments (
      school_id,
      product_id,
      quantity_delta,
      reason_code,
      notes,
      adjusted_by,
      inventory_movement_id
    )
    values (
      p_school_id,
      p_product_id,
      p_quantity_delta,
      coalesce(p_reason_code, p_movement_type::text),
      p_notes,
      p_actor_id,
      v_movement_id
    )
    returning id into v_adj_id;
  end if;

  return v_movement_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Product CRUD (school admin)
-- ---------------------------------------------------------------------------

create or replace function public.school_create_product(
  p_actor_id uuid,
  p_school_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_barcode text,
  p_price_cents bigint,
  p_cost_price_cents bigint,
  p_track_stock boolean,
  p_initial_stock int,
  p_low_stock_threshold int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_barcode text;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);
  perform private.seed_default_product_categories(p_school_id);

  if p_price_cents is null or p_price_cents < 0 then
    raise exception 'invalid_price';
  end if;

  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'invalid_name';
  end if;

  if not exists (
    select 1 from public.product_categories c
    where c.school_id = p_school_id and c.id = p_category_id and c.is_active
  ) then
    raise exception 'invalid_category';
  end if;

  v_barcode := nullif(trim(p_barcode), '');
  if v_barcode is not null and length(v_barcode) > 64 then
    raise exception 'invalid_barcode';
  end if;

  if p_track_stock and (p_initial_stock is null or p_initial_stock < 0) then
    raise exception 'invalid_stock';
  end if;

  insert into public.products (
    school_id,
    category_id,
    name,
    description,
    barcode,
    price_cents,
    cost_price_cents,
    track_stock,
    stock_quantity,
    low_stock_threshold,
    is_active
  )
  values (
    p_school_id,
    p_category_id,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    v_barcode,
    p_price_cents,
    p_cost_price_cents,
    coalesce(p_track_stock, false),
    0,
    p_low_stock_threshold,
    true
  )
  returning id into v_product_id;

  if coalesce(p_track_stock, false) and coalesce(p_initial_stock, 0) > 0 then
    perform private.apply_inventory_movement(
      p_actor_id,
      p_school_id,
      v_product_id,
      'initial',
      p_initial_stock,
      p_cost_price_cents,
      null,
      'product',
      v_product_id,
      'Initial stock on create',
      'initial',
      null
    );
  end if;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', p_school_id, 'product.create', 'product', v_product_id, 'success',
    jsonb_build_object('name', trim(p_name), 'price_cents', p_price_cents)
  );

  return jsonb_build_object('product_id', v_product_id);
end;
$$;

create or replace function public.school_update_product(
  p_actor_id uuid,
  p_product_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_barcode text,
  p_price_cents bigint,
  p_cost_price_cents bigint,
  p_track_stock boolean,
  p_low_stock_threshold int,
  p_is_active boolean,
  p_image_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_barcode text;
  v_was_tracking boolean;
begin
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'product_not_found'; end if;
  if v_product.archived_at is not null then raise exception 'product_archived'; end if;

  perform private.assert_actor_school_admin(p_actor_id, v_product.school_id);

  if p_price_cents is null or p_price_cents < 0 then
    raise exception 'invalid_price';
  end if;

  if p_name is null or length(trim(p_name)) < 1 then
    raise exception 'invalid_name';
  end if;

  if not exists (
    select 1 from public.product_categories c
    where c.school_id = v_product.school_id and c.id = p_category_id and c.is_active
  ) then
    raise exception 'invalid_category';
  end if;

  v_barcode := nullif(trim(p_barcode), '');
  if v_barcode is not null and length(v_barcode) > 64 then
    raise exception 'invalid_barcode';
  end if;

  v_was_tracking := v_product.track_stock;

  update public.products
  set
    category_id = p_category_id,
    name = trim(p_name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    barcode = v_barcode,
    price_cents = p_price_cents,
    cost_price_cents = p_cost_price_cents,
    track_stock = coalesce(p_track_stock, v_product.track_stock),
    low_stock_threshold = p_low_stock_threshold,
    is_active = coalesce(p_is_active, v_product.is_active),
    image_path = case
      when p_image_path is null then image_path
      when length(trim(p_image_path)) = 0 then null
      else trim(p_image_path)
    end
  where id = p_product_id;

  if coalesce(p_track_stock, v_product.track_stock)
     and not v_was_tracking
     and v_product.stock_quantity > 0 then
    -- stock already 0 when enabling tracking without movement — ok
    null;
  end if;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', v_product.school_id, 'product.update', 'product', p_product_id, 'success',
    jsonb_build_object('price_cents', p_price_cents)
  );

  return jsonb_build_object('product_id', p_product_id);
end;
$$;

create or replace function public.school_archive_product(p_actor_id uuid, p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  select school_id into v_school_id from public.products where id = p_product_id;
  if not found then raise exception 'product_not_found'; end if;

  perform private.assert_actor_school_admin(p_actor_id, v_school_id);

  update public.products
  set is_active = false, archived_at = now()
  where id = p_product_id
    and archived_at is null;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', v_school_id, 'product.archive', 'product', p_product_id, 'success', '{}'::jsonb
  );
end;
$$;

create or replace function public.school_adjust_inventory(
  p_actor_id uuid,
  p_product_id uuid,
  p_movement_type public.inventory_movement_type,
  p_quantity_delta int,
  p_reason text,
  p_reason_code text,
  p_notes text,
  p_supplier text,
  p_unit_cost_cents bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_movement_id uuid;
  v_stock int;
begin
  if p_movement_type not in ('restock', 'adjustment', 'write_off') then
    raise exception 'invalid_movement_type';
  end if;

  select school_id into v_school_id from public.products where id = p_product_id;
  if not found then raise exception 'product_not_found'; end if;

  perform private.assert_actor_school_admin(p_actor_id, v_school_id);

  if p_movement_type = 'write_off' and p_quantity_delta > 0 then
    p_quantity_delta := -p_quantity_delta;
  elsif p_movement_type = 'restock' and p_quantity_delta < 0 then
    p_quantity_delta := -p_quantity_delta;
  end if;

  v_movement_id := private.apply_inventory_movement(
    p_actor_id,
    v_school_id,
    p_product_id,
    p_movement_type,
    p_quantity_delta,
    p_unit_cost_cents,
    p_supplier,
    null,
    null,
    p_reason,
    p_reason_code,
    p_notes
  );

  select stock_quantity into v_stock from public.products where id = p_product_id;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', v_school_id, 'inventory.adjust', 'product', p_product_id, 'success',
    jsonb_build_object(
      'movement_type', p_movement_type,
      'quantity_delta', p_quantity_delta,
      'inventory_movement_id', v_movement_id
    )
  );

  return jsonb_build_object(
    'inventory_movement_id', v_movement_id,
    'stock_quantity', v_stock
  );
end;
$$;

revoke all on function private.seed_default_product_categories(uuid) from public;
revoke all on function private.apply_inventory_movement(uuid, uuid, uuid, public.inventory_movement_type, int, bigint, text, text, uuid, text, text, text) from public;

revoke all on function public.ensure_school_product_categories(uuid, uuid) from public;
revoke all on function public.school_create_product(uuid, uuid, uuid, text, text, text, bigint, bigint, boolean, int, int) from public;
revoke all on function public.school_update_product(uuid, uuid, uuid, text, text, text, bigint, bigint, boolean, int, boolean, text) from public;
revoke all on function public.school_archive_product(uuid, uuid) from public;
revoke all on function public.school_adjust_inventory(uuid, uuid, public.inventory_movement_type, int, text, text, text, text, bigint) from public;

grant execute on function public.ensure_school_product_categories(uuid, uuid) to service_role;
grant execute on function public.school_create_product(uuid, uuid, uuid, text, text, text, bigint, bigint, boolean, int, int) to service_role;
grant execute on function public.school_update_product(uuid, uuid, uuid, text, text, text, bigint, bigint, boolean, int, boolean, text) to service_role;
grant execute on function public.school_archive_product(uuid, uuid) to service_role;
grant execute on function public.school_adjust_inventory(uuid, uuid, public.inventory_movement_type, int, text, text, text, text, bigint) to service_role;
