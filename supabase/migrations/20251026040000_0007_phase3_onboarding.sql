-- 0007: Phase 3 — school onboarding, learners, guardian linking, dev card registration

-- ---------------------------------------------------------------------------
-- Actor checks (service-role RPCs pass p_actor_id; re-validated here)
-- ---------------------------------------------------------------------------

create or replace function private.assert_actor_super_admin(p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is null then
    raise exception 'unauthorised' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id
    where ra.user_id = p_actor_id
      and ra.role = 'super_admin'
      and ra.status = 'active'
      and p.status = 'active'
  ) then
    raise exception 'unauthorised' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.assert_actor_school_admin(p_actor_id uuid, p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is null or p_school_id is null then
    raise exception 'unauthorised' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.role_assignments ra
    join public.profiles p on p.id = ra.user_id
    join public.schools s on s.id = ra.school_id
    where ra.user_id = p_actor_id
      and ra.role = 'school_admin'
      and ra.school_id = p_school_id
      and ra.status = 'active'
      and p.status = 'active'
      and s.status in ('pending', 'active', 'suspended')
  ) then
    raise exception 'unauthorised' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.write_audit_log(
  p_actor_id uuid,
  p_actor_role public.app_role,
  p_school_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_outcome public.audit_outcome,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (
    actor_id, actor_role, school_id, action, entity_type, entity_id, outcome, metadata
  )
  values (
    p_actor_id, p_actor_role, p_school_id, p_action, p_entity_type, p_entity_id, p_outcome, p_metadata
  );
$$;

-- ---------------------------------------------------------------------------
-- Super-admin: onboard school + optional first school admin by email
-- ---------------------------------------------------------------------------

create or replace function public.onboard_school(
  p_actor_id uuid,
  p_name text,
  p_school_code text,
  p_province public.sa_province default 'gauteng',
  p_contact_email text default null,
  p_initial_admin_email extensions.citext default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_admin_id uuid;
begin
  perform private.assert_actor_super_admin(p_actor_id);

  if length(trim(p_name)) < 2 then
    raise exception 'invalid_name';
  end if;
  if length(trim(p_school_code)) < 2 then
    raise exception 'invalid_school_code';
  end if;

  insert into public.schools (name, school_code, province, contact_email, status)
  values (trim(p_name), lower(trim(p_school_code)), p_province, p_contact_email, 'pending')
  returning id into v_school_id;

  insert into public.school_settings (school_id)
  values (v_school_id);

  if p_initial_admin_email is not null then
    select p.id into v_admin_id
    from public.profiles p
    where p.email = lower(p_initial_admin_email::text)::extensions.citext;

    if v_admin_id is not null then
      insert into public.role_assignments (user_id, role, school_id, status, granted_by)
      values (v_admin_id, 'school_admin', v_school_id, 'active', p_actor_id)
      on conflict do nothing;
    end if;
  end if;

  perform private.write_audit_log(
    p_actor_id, 'super_admin', v_school_id, 'school.onboard', 'school', v_school_id, 'success',
    jsonb_build_object('school_code', lower(trim(p_school_code)))
  );

  return jsonb_build_object(
    'school_id', v_school_id,
    'school_code', lower(trim(p_school_code)),
    'admin_assigned', v_admin_id is not null
  );
end;
$$;

create or replace function public.activate_school(
  p_actor_id uuid,
  p_school_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_actor_super_admin(p_actor_id);

  update public.schools
  set
    status = 'active',
    status_reason = p_reason,
    status_changed_at = now(),
    status_changed_by = p_actor_id
  where id = p_school_id
    and status in ('pending', 'suspended');

  if not found then
    raise exception 'school_not_eligible';
  end if;

  perform private.write_audit_log(
    p_actor_id, 'super_admin', p_school_id, 'school.activate', 'school', p_school_id, 'success',
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- School admin: learner + wallet shell (ledger posting in Phase 5)
-- ---------------------------------------------------------------------------

create or replace function public.create_learner_with_wallet(
  p_actor_id uuid,
  p_school_id uuid,
  p_first_name text,
  p_last_name text,
  p_grade text,
  p_class_name text default null,
  p_admission_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_id uuid;
  v_wallet_id uuid;
  v_account_id uuid;
  v_ref text;
  v_school_status public.school_status;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  select status into v_school_status from public.schools where id = p_school_id;
  if v_school_status <> 'active' then
    raise exception 'school_not_active';
  end if;

  v_ref := coalesce(nullif(trim(p_admission_ref), ''), 'L-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8));

  insert into public.learners (
    school_id, first_name, last_name, grade, class_name, admission_ref, created_by
  )
  values (
    p_school_id,
    trim(p_first_name),
    trim(p_last_name),
    trim(p_grade),
    nullif(trim(p_class_name), ''),
    v_ref,
    p_actor_id
  )
  returning id into v_learner_id;

  v_wallet_id := gen_random_uuid();
  v_account_id := gen_random_uuid();

  insert into public.ledger_accounts (
    id, school_id, account_type, wallet_id, normal_side, name
  )
  values (
    v_account_id,
    p_school_id,
    'wallet_liability',
    v_wallet_id,
    'credit',
    'Wallet ' || v_ref
  );

  insert into public.wallets (id, school_id, learner_id, ledger_account_id)
  values (v_wallet_id, p_school_id, v_learner_id, v_account_id);

  perform private.write_audit_log(
    p_actor_id, 'school_admin', p_school_id, 'learner.create', 'learner', v_learner_id, 'success',
    jsonb_build_object('admission_ref', v_ref, 'wallet_id', v_wallet_id)
  );

  return jsonb_build_object(
    'learner_id', v_learner_id,
    'wallet_id', v_wallet_id,
    'admission_ref', v_ref
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Parent invitations & linking
-- ---------------------------------------------------------------------------

create or replace function public.create_parent_invitation(
  p_actor_id uuid,
  p_school_id uuid,
  p_learner_id uuid,
  p_invited_email extensions.citext default null,
  p_relationship public.guardian_relationship default 'guardian'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_hash text;
  v_invitation_id uuid;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  if not exists (
    select 1 from public.learners l
    where l.id = p_learner_id
      and l.school_id = p_school_id
      and l.status = 'active'
  ) then
    raise exception 'learner_not_found';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.parent_invitations (
    school_id,
    learner_id,
    invited_email,
    relationship_type,
    token_hash,
    expires_at,
    created_by
  )
  values (
    p_school_id,
    p_learner_id,
    p_invited_email,
    p_relationship,
    v_hash,
    now() + interval '7 days',
    p_actor_id
  )
  returning id into v_invitation_id;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', p_school_id, 'parent_invitation.create', 'parent_invitation',
    v_invitation_id, 'success',
    jsonb_build_object('learner_id', p_learner_id, 'email_locked', p_invited_email is not null)
  );

  return jsonb_build_object('invitation_id', v_invitation_id, 'token', v_token);
end;
$$;

create or replace function public.accept_parent_invitation(
  p_actor_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_inv public.parent_invitations%rowtype;
  v_profile public.profiles%rowtype;
  v_link_status public.guardian_link_status;
  v_relationship_id uuid;
begin
  if p_actor_id is null or p_token is null or length(p_token) < 32 then
    raise exception 'invalid_token';
  end if;

  select * into v_profile from public.profiles where id = p_actor_id and status = 'active';
  if not found then
    raise exception 'unauthorised';
  end if;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select * into v_inv
  from public.parent_invitations
  where token_hash = v_hash
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    update public.parent_invitations
    set failed_attempts = failed_attempts + 1
    where token_hash = v_hash;
    raise exception 'invalid_token';
  end if;

  if v_inv.invited_email is not null and v_inv.invited_email <> v_profile.email then
    perform private.write_audit_log(
      p_actor_id, 'parent', v_inv.school_id, 'parent_invitation.accept', 'parent_invitation',
      v_inv.id, 'denied', jsonb_build_object('reason', 'email_mismatch')
    );
    raise exception 'email_mismatch';
  end if;

  if exists (
    select 1 from public.schools s where s.id = v_inv.school_id and s.status <> 'active'
  ) then
    raise exception 'school_not_active';
  end if;

  if v_inv.invited_email is not null then
    v_link_status := 'active';
  else
    v_link_status := 'pending_approval';
  end if;

  insert into public.parent_learner_relationships (
    school_id,
    learner_id,
    parent_id,
    relationship_type,
    status,
    can_top_up,
    can_manage_controls,
    approved_by,
    approved_at
  )
  values (
    v_inv.school_id,
    v_inv.learner_id,
    p_actor_id,
    v_inv.relationship_type,
    v_link_status,
    v_inv.can_top_up,
    v_inv.can_manage_controls,
    case when v_link_status = 'active' then p_actor_id else null end,
    case when v_link_status = 'active' then now() else null end
  )
  on conflict (learner_id, parent_id) do update
  set
    status = excluded.status,
    relationship_type = excluded.relationship_type,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at
  returning id into v_relationship_id;

  update public.parent_invitations
  set
    status = 'accepted',
    accepted_by = p_actor_id,
    accepted_at = now()
  where id = v_inv.id;

  perform private.write_audit_log(
    p_actor_id, 'parent', v_inv.school_id, 'parent_invitation.accept', 'parent_learner_relationship',
    v_relationship_id, 'success',
    jsonb_build_object('link_status', v_link_status)
  );

  return jsonb_build_object(
    'relationship_id', v_relationship_id,
    'status', v_link_status,
    'learner_id', v_inv.learner_id,
    'school_id', v_inv.school_id
  );
end;
$$;

create or replace function public.approve_guardian_link(
  p_actor_id uuid,
  p_relationship_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  select school_id into v_school_id
  from public.parent_learner_relationships
  where id = p_relationship_id
    and status = 'pending_approval';

  if not found then
    raise exception 'not_found';
  end if;

  perform private.assert_actor_school_admin(p_actor_id, v_school_id);

  update public.parent_learner_relationships
  set
    status = 'active',
    approved_by = p_actor_id,
    approved_at = now()
  where id = p_relationship_id;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', v_school_id, 'guardian.approve', 'parent_learner_relationship',
    p_relationship_id, 'success', '{}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Dev / pilot: register blank card UID (not secure; Phase 8 replaces this)
-- ---------------------------------------------------------------------------

create or replace function public.register_card_uid_for_learner(
  p_actor_id uuid,
  p_school_id uuid,
  p_learner_id uuid,
  p_uid text,
  p_card_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_id uuid;
  v_allow boolean;
  v_cred text;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  select allow_uid_only_cards into v_allow
  from public.school_settings
  where school_id = p_school_id;

  if not coalesce(v_allow, false) then
    raise exception 'uid_cards_disabled';
  end if;

  if p_uid is null or length(trim(p_uid)) < 4 then
    raise exception 'invalid_uid';
  end if;

  v_cred := 'uid:' || lower(trim(p_uid));

  insert into public.nfc_cards (
    school_id,
    learner_id,
    credential_scheme,
    credential_reference,
    card_status,
    card_number,
    activated_at
  )
  values (
    p_school_id,
    p_learner_id,
    'uid_only',
    v_cred,
    'active',
    nullif(trim(p_card_number), ''),
    now()
  )
  returning id into v_card_id;

  perform private.write_audit_log(
    p_actor_id, 'school_admin', p_school_id, 'card.register_uid', 'nfc_card', v_card_id, 'success',
    jsonb_build_object('learner_id', p_learner_id, 'scheme', 'uid_only')
  );

  return jsonb_build_object('card_id', v_card_id);
end;
$$;

revoke all on function public.onboard_school(uuid, text, text, public.sa_province, text, extensions.citext) from public;
revoke all on function public.activate_school(uuid, uuid, text) from public;
revoke all on function public.create_learner_with_wallet(uuid, uuid, text, text, text, text, text) from public;
revoke all on function public.create_parent_invitation(uuid, uuid, uuid, extensions.citext, public.guardian_relationship) from public;
revoke all on function public.accept_parent_invitation(uuid, text) from public;
revoke all on function public.approve_guardian_link(uuid, uuid) from public;
revoke all on function public.register_card_uid_for_learner(uuid, uuid, uuid, text, text) from public;

grant execute on function public.onboard_school(uuid, text, text, public.sa_province, text, extensions.citext) to service_role;
grant execute on function public.activate_school(uuid, uuid, text) to service_role;
grant execute on function public.create_learner_with_wallet(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.create_parent_invitation(uuid, uuid, uuid, extensions.citext, public.guardian_relationship) to service_role;
grant execute on function public.accept_parent_invitation(uuid, text) to service_role;
grant execute on function public.approve_guardian_link(uuid, uuid) to service_role;
grant execute on function public.register_card_uid_for_learner(uuid, uuid, uuid, text, text) to service_role;
