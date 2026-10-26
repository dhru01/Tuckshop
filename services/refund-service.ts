import 'server-only';

import { callRpc } from '@/services/rpc';

export type RefundLine = { purchase_item_id: string; quantity: number };

export async function requestPurchaseRefund(
  actorId: string,
  schoolId: string,
  params: {
    purchaseId: string;
    lines: RefundLine[];
    reason: string;
    restock: boolean;
    idempotencyKey: string;
  },
) {
  return callRpc<Record<string, unknown>>('pos_request_purchase_refund', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_purchase_id: params.purchaseId,
    p_lines: params.lines,
    p_reason: params.reason,
    p_restock: params.restock,
    p_idempotency_key: params.idempotencyKey,
  });
}

export async function approvePurchaseRefund(actorId: string, schoolId: string, refundId: string) {
  return callRpc<Record<string, unknown>>('school_approve_purchase_refund', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_refund_id: refundId,
  });
}
