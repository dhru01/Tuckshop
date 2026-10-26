-- 0008: Phase 4 — parent spending limits, card freeze, purchase_items RLS for guardians

create table public.spending_limits (
  school_id uuid not null,
  learner_id uuid not null,
  daily_limit_cents bigint check (daily_limit_cents is null or daily_limit_cents >= 0),
  weekly_limit_cents bigint check (weekly_limit_cents is null or weekly_limit_cents >= 0),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (learner_id),
  foreign key (school_id, learner_id) references public.learners (school_id, id) on delete restrict
);

alter table public.spending_limits enable row level security;
alter table public.spending_limits force row level security;

create policy spending_limits_select_guardian on public.spending_limits
for select to authenticated
using (private.is_guardian_of_learner(learner_id));

create policy spending_limits_select_staff on public.spending_limits
for select to authenticated
using (private.is_school_admin(school_id) or private.is_school_staff(school_id));

create policy purchase_items_select_guardian on public.purchase_items
for select to authenticated
using (
  exists (
    select 1
    from public.purchases p
    where p.id = purchase_items.purchase_id
      and p.school_id = purchase_items.school_id
      and private.is_guardian_of_learner(p.learner_id)
  )
);

create or replace function private.assert_guardian_can_manage_controls(p_actor_id uuid, p_learner_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  if p_actor_id is null or p_learner_id is null then
    raise exception 'unauthorised' using errcode = '42501';
  end if;

  select plr.school_id into v_school_id
  from public.parent_learner_relationships plr
  where plr.parent_id = p_actor_id
    and plr.learner_id = p_learner_id
    and plr.status = 'active'
    and plr.can_manage_controls = true;

  if v_school_id is null then
    raise exception 'unauthorised' using errcode = '42501';
  end if;

  return v_school_id;
end;
$$;

create or replace function public.parent_set_spending_limits(
  p_actor_id uuid,
  p_learner_id uuid,
  p_daily_limit_cents bigint,
  p_weekly_limit_cents bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  v_school_id := private.assert_guardian_can_manage_controls(p_actor_id, p_learner_id);

  if p_daily_limit_cents is not null and p_daily_limit_cents < 0 then
    raise exception 'invalid_daily_limit';
  end if;
  if p_weekly_limit_cents is not null and p_weekly_limit_cents < 0 then
    raise exception 'invalid_weekly_limit';
  end if;

  insert into public.spending_limits (school_id, learner_id, daily_limit_cents, weekly_limit_cents, updated_by)
  values (v_school_id, p_learner_id, p_daily_limit_cents, p_weekly_limit_cents, p_actor_id)
  on conflict (learner_id) do update
  set
    daily_limit_cents = excluded.daily_limit_cents,
    weekly_limit_cents = excluded.weekly_limit_cents,
    updated_by = excluded.updated_by,
    updated_at = now();

  perform private.write_audit_log(
    p_actor_id, 'parent', v_school_id, 'spending_limits.update', 'learner', p_learner_id, 'success',
    jsonb_build_object(
      'daily_limit_cents', p_daily_limit_cents,
      'weekly_limit_cents', p_weekly_limit_cents
    )
  );
end;
$$;

create or replace function public.parent_set_card_frozen(
  p_actor_id uuid,
  p_card_id uuid,
  p_frozen boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.nfc_cards%rowtype;
  v_school_id uuid;
  v_new_status public.card_status;
begin
  select * into v_card from public.nfc_cards where id = p_card_id;
  if not found or v_card.learner_id is null then
    raise exception 'card_not_found';
  end if;

  v_school_id := private.assert_guardian_can_manage_controls(p_actor_id, v_card.learner_id);

  if v_card.school_id <> v_school_id then
    raise exception 'unauthorised' using errcode = '42501';
  end if;

  v_new_status := case when p_frozen then 'frozen'::public.card_status else 'active'::public.card_status end;

  if p_frozen and v_card.card_status <> 'active' then
    raise exception 'card_not_active';
  end if;
  if not p_frozen and v_card.card_status <> 'frozen' then
    raise exception 'card_not_frozen';
  end if;

  update public.nfc_cards
  set card_status = v_new_status,
      status_reason = case when p_frozen then 'parent_freeze' else null end
  where id = p_card_id;

  perform private.write_audit_log(
    p_actor_id, 'parent', v_school_id,
    case when p_frozen then 'card.freeze' else 'card.unfreeze' end,
    'nfc_card', p_card_id, 'success', '{}'::jsonb
  );
end;
$$;

revoke all on function public.parent_set_spending_limits(uuid, uuid, bigint, bigint) from public;
revoke all on function public.parent_set_card_frozen(uuid, uuid, boolean) from public;
grant execute on function public.parent_set_spending_limits(uuid, uuid, bigint, bigint) to service_role;
grant execute on function public.parent_set_card_frozen(uuid, uuid, boolean) to service_role;
