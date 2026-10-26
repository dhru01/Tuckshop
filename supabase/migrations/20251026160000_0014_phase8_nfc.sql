-- 0014: Phase 8 — card events, lifecycle RPCs, checkout credential scheme gate

create type public.card_event_type as enum (
  'issued',
  'assigned',
  'activated',
  'frozen',
  'unfrozen',
  'lost',
  'stolen',
  'replaced',
  'deactivated',
  'read_ok',
  'read_rejected',
  'replay_detected'
);

create table public.card_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  card_id uuid references public.nfc_cards (id) on delete set null,
  event_type public.card_event_type not null,
  from_status public.card_status,
  to_status public.card_status,
  actor_id uuid references public.profiles (id) on delete set null,
  reader_device_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index card_events_school_created_idx on public.card_events (school_id, created_at desc);
create index card_events_card_idx on public.card_events (card_id, created_at desc);

alter table public.card_events enable row level security;
alter table public.card_events force row level security;

create policy card_events_select_staff on public.card_events
for select to authenticated
using (private.is_school_staff(school_id) or private.is_school_admin(school_id));

revoke insert, update, delete on public.card_events from authenticated;
grant select on public.card_events to authenticated;

create or replace function private.write_card_event(
  p_school_id uuid,
  p_card_id uuid,
  p_event_type public.card_event_type,
  p_from_status public.card_status,
  p_to_status public.card_status,
  p_actor_id uuid,
  p_reason text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.card_events (
    school_id, card_id, event_type, from_status, to_status, actor_id, reason, metadata
  )
  values (
    p_school_id, p_card_id, p_event_type, p_from_status, p_to_status, p_actor_id,
    nullif(trim(p_reason), ''), coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function private.platform_environment()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value->>'env' from public.platform_settings where key = 'environment'),
    'development'
  );
$$;

create or replace function private.credential_scheme_allowed(
  p_scheme public.credential_scheme,
  p_school_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_env text := private.platform_environment();
  v_uid boolean;
  v_sim boolean;
begin
  if p_scheme = 'simulated' then
    if v_env = 'production' then
      return false;
    end if;
    select coalesce(allow_simulated_cards, false) into v_sim
    from public.school_settings where school_id = p_school_id;
    return v_sim;
  end if;

  if p_scheme = 'uid_only' then
    if v_env = 'production' then
      return false;
    end if;
    select coalesce(allow_uid_only_cards, false) into v_uid
    from public.school_settings where school_id = p_school_id;
    return v_uid;
  end if;

  return p_scheme in ('ntag424_sdm', 'desfire_ev3');
end;
$$;

create or replace function public.pos_validate_credential_for_checkout(
  p_actor_id uuid,
  p_school_id uuid,
  p_credential_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cred text := lower(trim(p_credential_reference));
  v_card public.nfc_cards%rowtype;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);

  if v_cred is null or length(v_cred) < 4 then
    return jsonb_build_object('ok', false, 'failure_code', 'INVALID_CREDENTIAL');
  end if;

  select * into v_card from public.nfc_cards where credential_reference = v_cred and school_id = p_school_id;
  if not found then
    perform private.write_card_event(
      p_school_id, null, 'read_rejected', null, null, p_actor_id, 'unknown_credential',
      jsonb_build_object('credential_prefix', left(v_cred, 12))
    );
    return jsonb_build_object('ok', false, 'failure_code', 'UNKNOWN_CARD');
  end if;

  if not private.credential_scheme_allowed(v_card.credential_scheme, p_school_id) then
    perform private.write_card_event(
      p_school_id, v_card.id, 'read_rejected', v_card.card_status, v_card.card_status, p_actor_id,
      'scheme_blocked', jsonb_build_object('scheme', v_card.credential_scheme)
    );
    return jsonb_build_object('ok', false, 'failure_code', 'INVALID_CREDENTIAL');
  end if;

  return jsonb_build_object(
    'ok', true,
    'card_id', v_card.id,
    'credential_scheme', v_card.credential_scheme
  );
end;
$$;

create or replace function public.school_set_card_status(
  p_actor_id uuid,
  p_school_id uuid,
  p_card_id uuid,
  p_new_status public.card_status,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.nfc_cards%rowtype;
  v_event public.card_event_type;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  select * into v_card from public.nfc_cards where id = p_card_id and school_id = p_school_id for update;
  if not found then
    raise exception 'card_not_found';
  end if;

  if v_card.card_status = p_new_status then
    return jsonb_build_object('card_id', v_card.id, 'status', v_card.card_status);
  end if;

  if p_new_status = 'frozen' and v_card.card_status <> 'active' then
    raise exception 'invalid_transition';
  end if;
  if p_new_status = 'active' and v_card.card_status <> 'frozen' then
    raise exception 'invalid_transition';
  end if;
  if p_new_status in ('lost', 'stolen', 'deactivated') and v_card.card_status not in ('active', 'frozen') then
    raise exception 'invalid_transition';
  end if;
  if p_new_status = 'replaced' then
    raise exception 'invalid_transition';
  end if;

  v_event := case p_new_status
    when 'frozen' then 'frozen'::public.card_event_type
    when 'active' then 'unfrozen'::public.card_event_type
    when 'lost' then 'lost'::public.card_event_type
    when 'stolen' then 'stolen'::public.card_event_type
    when 'deactivated' then 'deactivated'::public.card_event_type
    else 'deactivated'::public.card_event_type
  end;

  update public.nfc_cards
  set
    card_status = p_new_status,
    status_reason = nullif(trim(p_reason), ''),
    deactivated_at = case when p_new_status in ('lost', 'stolen', 'deactivated') then now() else deactivated_at end
  where id = p_card_id;

  perform private.write_card_event(
    p_school_id, p_card_id, v_event, v_card.card_status, p_new_status, p_actor_id, p_reason, '{}'::jsonb
  );

  perform private.write_audit_log(
    p_actor_id, 'school_admin', p_school_id, 'card.status', 'nfc_card', p_card_id, 'success',
    jsonb_build_object('from', v_card.card_status, 'to', p_new_status)
  );

  return jsonb_build_object('card_id', p_card_id, 'status', p_new_status);
end;
$$;

create or replace function public.school_replace_card_uid(
  p_actor_id uuid,
  p_school_id uuid,
  p_old_card_id uuid,
  p_new_uid text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.nfc_cards%rowtype;
  v_new_id uuid;
  v_cred text;
  v_allow_uid boolean;
begin
  perform private.assert_actor_school_admin(p_actor_id, p_school_id);

  select coalesce(allow_uid_only_cards, false) into v_allow_uid
  from public.school_settings where school_id = p_school_id;
  if not coalesce(v_allow_uid, false) then
    raise exception 'uid_only_disabled';
  end if;

  select * into v_old from public.nfc_cards where id = p_old_card_id and school_id = p_school_id for update;
  if not found or v_old.learner_id is null then
    raise exception 'card_not_found';
  end if;

  if v_old.card_status not in ('active', 'frozen', 'lost', 'stolen') then
    raise exception 'invalid_transition';
  end if;

  v_cred := 'uid:' || lower(trim(p_new_uid));
  if length(trim(p_new_uid)) < 4 then
    raise exception 'invalid_uid';
  end if;

  insert into public.nfc_cards (
    school_id, learner_id, credential_scheme, credential_reference,
    card_status, activated_at, replaced_by_card_id
  )
  values (
    p_school_id, v_old.learner_id, 'uid_only', v_cred, 'active', now(), null
  )
  returning id into v_new_id;

  update public.nfc_cards
  set
    card_status = 'replaced',
    status_reason = nullif(trim(p_reason), ''),
    deactivated_at = now(),
    replaced_by_card_id = v_new_id
  where id = p_old_card_id;

  perform private.write_card_event(
    p_school_id, p_old_card_id, 'replaced', v_old.card_status, 'replaced', p_actor_id, p_reason,
    jsonb_build_object('new_card_id', v_new_id)
  );

  perform private.write_card_event(
    p_school_id, v_new_id, 'issued', null, 'active', p_actor_id, 'replacement', jsonb_build_object('replaces', p_old_card_id)
  );

  return jsonb_build_object('old_card_id', p_old_card_id, 'new_card_id', v_new_id);
end;
$$;

create or replace function public.pos_record_card_read(
  p_actor_id uuid,
  p_school_id uuid,
  p_card_id uuid,
  p_read_counter bigint,
  p_ok boolean,
  p_failure_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.nfc_cards%rowtype;
begin
  perform private.assert_actor_pos(p_actor_id, p_school_id);
  select * into v_card from public.nfc_cards where id = p_card_id and school_id = p_school_id for update;
  if not found then return; end if;

  if p_ok then
    if p_read_counter is not null and v_card.credential_scheme = 'ntag424_sdm' then
      if p_read_counter <= v_card.last_read_counter then
        perform private.write_card_event(
          p_school_id, p_card_id, 'replay_detected', v_card.card_status, v_card.card_status,
          p_actor_id, null, jsonb_build_object('counter', p_read_counter)
        );
        raise exception 'replay_detected';
      end if;
      update public.nfc_cards set last_read_counter = p_read_counter where id = p_card_id;
    end if;
    perform private.write_card_event(
      p_school_id, p_card_id, 'read_ok', v_card.card_status, v_card.card_status, p_actor_id, null, '{}'::jsonb
    );
  else
    perform private.write_card_event(
      p_school_id, p_card_id, 'read_rejected', v_card.card_status, v_card.card_status,
      p_actor_id, p_failure_code, '{}'::jsonb
    );
  end if;
end;
$$;

revoke all on function private.write_card_event(uuid, uuid, public.card_event_type, public.card_status, public.card_status, uuid, text, jsonb) from public;
revoke all on function private.platform_environment() from public;
revoke all on function private.credential_scheme_allowed(public.credential_scheme, uuid) from public;

revoke all on function public.pos_validate_credential_for_checkout(uuid, uuid, text) from public;
revoke all on function public.school_set_card_status(uuid, uuid, uuid, public.card_status, text) from public;
revoke all on function public.school_replace_card_uid(uuid, uuid, uuid, text, text) from public;
revoke all on function public.pos_record_card_read(uuid, uuid, uuid, bigint, boolean, text) from public;

grant execute on function public.pos_validate_credential_for_checkout(uuid, uuid, text) to service_role;
grant execute on function public.school_set_card_status(uuid, uuid, uuid, public.card_status, text) to service_role;
grant execute on function public.school_replace_card_uid(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.pos_record_card_read(uuid, uuid, uuid, bigint, boolean, text) to service_role;
