-- 0005: auth bootstrap + RLS helper functions

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email::extensions.citext
  );

  insert into public.role_assignments (user_id, role, status)
  values (new.id, 'parent', 'active')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.has_active_role(_role public.app_role, _school_id uuid default null)
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
    where ra.user_id = auth.uid()
      and p.status = 'active'
      and ra.status = 'active'
      and ra.role = _role
      and (
        _school_id is null
        or ra.school_id = _school_id
        or ra.role in ('parent', 'super_admin')
      )
  );
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_active_role('super_admin');
$$;

create or replace function private.is_school_staff(_school_id uuid)
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
    where ra.user_id = auth.uid()
      and p.status = 'active'
      and ra.status = 'active'
      and ra.role in ('cashier', 'school_admin')
      and ra.school_id = _school_id
      and s.status in ('active', 'suspended')
  );
$$;

create or replace function private.is_school_admin(_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_active_role('school_admin', _school_id);
$$;

create or replace function private.is_guardian_of_learner(_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_learner_relationships plr
    where plr.parent_id = auth.uid()
      and plr.learner_id = _learner_id
      and plr.status = 'active'
  );
$$;

grant execute on function private.has_active_role(public.app_role, uuid) to authenticated, service_role;
grant execute on function private.is_super_admin() to authenticated, service_role;
grant execute on function private.is_school_staff(uuid) to authenticated, service_role;
grant execute on function private.is_school_admin(uuid) to authenticated, service_role;
grant execute on function private.is_guardian_of_learner(uuid) to authenticated, service_role;
