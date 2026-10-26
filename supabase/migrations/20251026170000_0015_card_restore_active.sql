-- Allow school admins to restore cards mistakenly marked lost/stolen.

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
  if p_new_status = 'active' and v_card.card_status not in ('frozen', 'lost', 'stolen') then
    raise exception 'invalid_transition';
  end if;
  if p_new_status in ('lost', 'stolen', 'deactivated') and v_card.card_status not in ('active', 'frozen') then
    raise exception 'invalid_transition';
  end if;
  if p_new_status = 'replaced' then
    raise exception 'invalid_transition';
  end if;

  v_event := case
    when p_new_status = 'frozen' then 'frozen'::public.card_event_type
    when p_new_status = 'active' and v_card.card_status = 'frozen' then 'unfrozen'::public.card_event_type
    when p_new_status = 'active' then 'activated'::public.card_event_type
    when p_new_status = 'lost' then 'lost'::public.card_event_type
    when p_new_status = 'stolen' then 'stolen'::public.card_event_type
    when p_new_status = 'deactivated' then 'deactivated'::public.card_event_type
    else 'deactivated'::public.card_event_type
  end;

  update public.nfc_cards
  set
    card_status = p_new_status,
    status_reason = nullif(trim(p_reason), ''),
    deactivated_at = case
      when p_new_status in ('lost', 'stolen', 'deactivated') then now()
      when p_new_status = 'active' then null
      else deactivated_at
    end
  where id = p_card_id;

  perform private.write_card_event(
    p_school_id, p_card_id, v_event, v_card.card_status, p_new_status, p_actor_id, p_reason, '{}'::jsonb
  );

  perform private.write_audit_log(
    p_actor_id, 'school_admin', p_school_id, 'card.status', 'nfc_card', p_card_id, 'success',
    jsonb_build_object('from', v_card.card_status, 'to', p_new_status)
  );

  return jsonb_build_object('card_id', v_card.id, 'status', p_new_status);
end;
$$;
