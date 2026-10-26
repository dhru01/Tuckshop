import 'server-only';

import { callRpc } from '@/services/rpc';

export type PosBasketItem = { product_id: string; quantity: number };

export async function posEnsureDevice(actorId: string, schoolId: string, deviceName: string) {
  return callRpc<{ pos_device_id: string; name: string }>('pos_ensure_device', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_device_name: deviceName,
  });
}

export async function posOpenShift(actorId: string, schoolId: string, posDeviceId: string | null) {
  return callRpc<{ shift_id: string }>('pos_open_shift', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_pos_device_id: posDeviceId,
  });
}

export async function posCloseShift(actorId: string, shiftId: string, notes: string) {
  return callRpc<{ shift_id: string; sales_count: number; sales_total_cents: number }>(
    'pos_close_shift',
    { p_actor_id: actorId, p_shift_id: shiftId, p_notes: notes },
  );
}

export async function posPreviewCheckout(
  actorId: string,
  schoolId: string,
  credentialReference: string,
  items: PosBasketItem[],
) {
  return callRpc<Record<string, unknown>>('pos_preview_checkout', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_credential_reference: credentialReference,
    p_items: items,
  });
}

export async function posCheckout(
  actorId: string,
  schoolId: string,
  params: {
    idempotencyKey: string;
    requestHash: string;
    credentialReference: string;
    items: PosBasketItem[];
    shiftId: string;
    posDeviceId: string | null;
  },
) {
  return callRpc<Record<string, unknown>>('pos_checkout', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_idempotency_key: params.idempotencyKey,
    p_request_hash: params.requestHash,
    p_credential_reference: params.credentialReference,
    p_items: params.items,
    p_shift_id: params.shiftId,
    p_pos_device_id: params.posDeviceId,
  });
}

export async function posGetPurchaseStatus(
  actorId: string,
  schoolId: string,
  idempotencyKey: string,
) {
  return callRpc<Record<string, unknown>>('pos_get_purchase_status', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_idempotency_key: idempotencyKey,
  });
}

export async function posLogPurchaseAttempt(
  actorId: string,
  schoolId: string,
  params: {
    idempotencyKey: string;
    failureCode: string;
    cardId: string | null;
    learnerId: string | null;
    posDeviceId: string | null;
    totalCents: number | null;
  },
) {
  return callRpc<null>('pos_log_purchase_attempt', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_idempotency_key: params.idempotencyKey,
    p_outcome: 'declined',
    p_failure_code: params.failureCode,
    p_card_id: params.cardId,
    p_learner_id: params.learnerId,
    p_pos_device_id: params.posDeviceId,
    p_total_cents: params.totalCents,
  });
}
