import 'server-only';

import { callRpc } from '@/services/rpc';

export async function posValidateCredentialForCheckout(
  actorId: string,
  schoolId: string,
  credentialReference: string,
) {
  return callRpc<{ ok: boolean; failure_code?: string; card_id?: string }>(
    'pos_validate_credential_for_checkout',
    {
      p_actor_id: actorId,
      p_school_id: schoolId,
      p_credential_reference: credentialReference,
    },
  );
}

export async function schoolSetCardStatus(
  actorId: string,
  schoolId: string,
  cardId: string,
  newStatus: string,
  reason: string,
) {
  return callRpc<{ card_id: string; status: string }>('school_set_card_status', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_card_id: cardId,
    p_new_status: newStatus,
    p_reason: reason,
  });
}

export async function schoolReplaceCardUid(
  actorId: string,
  schoolId: string,
  oldCardId: string,
  newUid: string,
  reason: string,
) {
  return callRpc<{ old_card_id: string; new_card_id: string }>('school_replace_card_uid', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_old_card_id: oldCardId,
    p_new_uid: newUid,
    p_reason: reason,
  });
}

export async function posRecordCardRead(
  actorId: string,
  schoolId: string,
  cardId: string,
  readCounter: number | null,
  ok: boolean,
  failureCode: string | null,
) {
  return callRpc<void>('pos_record_card_read', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_card_id: cardId,
    p_read_counter: readCounter,
    p_ok: ok,
    p_failure_code: failureCode,
  });
}
