'use server';

import { revalidatePath } from 'next/cache';

import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { approvePurchaseRefund, requestPurchaseRefund, type RefundLine } from '@/services/refund-service';

export type RefundActionState = { error?: string; success?: string };

async function schoolContext():
  Promise<{ error: string } | { schoolId: string; actor: string; role: string }> {
  const access = await requireActorForInterface('pos');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };
  return { schoolId, actor: actorId(access), role: access.active.role };
}

export async function requestRefundAction(input: {
  purchaseId: string;
  lines: RefundLine[];
  reason: string;
  restock: boolean;
  idempotencyKey: string;
}): Promise<
  | { ok: true; status: string; amountCents: number; refundId: string; pendingApproval?: boolean }
  | { ok: false; message: string }
> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { ok: false, message: ctx.error };

  const { data, error } = await requestPurchaseRefund(ctx.actor, ctx.schoolId, {
    purchaseId: input.purchaseId,
    lines: input.lines,
    reason: input.reason,
    restock: input.restock,
    idempotencyKey: input.idempotencyKey,
  });
  if (error || !data) {
    return { ok: false, message: 'Could not submit refund. Try again.' };
  }

  const status = String(data.status ?? '');
  if (status === 'declined' || status === 'error') {
    return { ok: false, message: 'This refund cannot be processed.' };
  }

  revalidatePath('/pos/refunds');
  revalidatePath('/parent/wallet');
  revalidatePath('/parent/transactions');

  if (status === 'pending_approval') {
    return {
      ok: true,
      status,
      amountCents: Number(data.amount_cents),
      refundId: String(data.refund_id),
      pendingApproval: true,
    };
  }

  return {
    ok: true,
    status: 'completed',
    amountCents: Number(data.amount_cents),
    refundId: String(data.refund_id),
  };
}

export async function approveRefundAction(refundId: string): Promise<RefundActionState> {
  const access = await requireActorForInterface('pos');
  if (access.active.role !== 'school_admin') {
    return { error: 'Only a school admin can approve refunds.' };
  }
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };

  const { data, error } = await approvePurchaseRefund(actorId(access), schoolId, refundId);
  if (error || !data || String(data.status) !== 'completed') {
    return { error: 'Could not approve refund.' };
  }

  revalidatePath('/pos/refunds');
  revalidatePath('/school/transactions');
  revalidatePath('/parent/wallet');
  return { success: 'Refund completed and wallet credited.' };
}
