'use server';

import { revalidatePath } from 'next/cache';

import { normaliseCredentialReference } from '@/lib/nfc/credential';
import { messageForFailureCode } from '@/lib/pos/map-failure';
import { buildCheckoutRequestHash, type BasketLine } from '@/lib/pos/request-hash';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { posValidateCredentialForCheckout } from '@/services/card-service';
import {
  posCheckout,
  posCloseShift,
  posEnsureDevice,
  posGetPurchaseStatus,
  posLogPurchaseAttempt,
  posOpenShift,
  posPreviewCheckout,
  type PosBasketItem,
} from '@/services/pos-service';

export type PosActionState = { error?: string; success?: string };

type PosContext =
  | { error: string }
  | { access: Awaited<ReturnType<typeof requireActorForInterface>>; schoolId: string; actor: string };

async function posContext(): Promise<PosContext> {
  const access = await requireActorForInterface('pos');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };
  return { access, schoolId, actor: actorId(access) };
}

function toRpcItems(lines: BasketLine[]): PosBasketItem[] {
  return lines.map((l) => ({ product_id: l.productId, quantity: l.quantity }));
}

export async function ensurePosDeviceAction(deviceName: string) {
  const ctx = await posContext();
  if ('error' in ctx) return { error: ctx.error };
  const name = deviceName.trim() || 'Tuckshop terminal';
  const { data, error } = await posEnsureDevice(ctx.actor, ctx.schoolId, name);
  if (error || !data) return { error: 'Could not register device.' };
  return { posDeviceId: data.pos_device_id, name: data.name };
}

export async function openShiftAction(posDeviceId: string | null) {
  const ctx = await posContext();
  if ('error' in ctx) return { error: ctx.error };
  const { data, error } = await posOpenShift(ctx.actor, ctx.schoolId, posDeviceId);
  if (error || !data) return { error: 'Could not open shift. You may already have one open.' };
  return { shiftId: data.shift_id };
}

export async function closeShiftAction(shiftId: string, notes: string) {
  const ctx = await posContext();
  if ('error' in ctx) return { error: ctx.error };
  const { data, error } = await posCloseShift(ctx.actor, shiftId, notes);
  if (error || !data) return { error: 'Could not close shift.' };
  revalidatePath('/pos/shift');
  return {
    success: `Shift closed. ${data.sales_count} sale(s), total R${(data.sales_total_cents / 100).toFixed(2)}.`,
  };
}

export type PreviewResult =
  | { ok: true; preview: Record<string, unknown> }
  | { ok: false; message: string; failureCode?: string };

export async function previewCheckoutAction(
  credentialRaw: string,
  lines: BasketLine[],
): Promise<PreviewResult> {
  const ctx = await posContext();
  if ('error' in ctx) return { ok: false, message: ctx.error };

  const credential = normaliseCredentialReference(credentialRaw);
  const validated = await posValidateCredentialForCheckout(ctx.actor, ctx.schoolId, credential);
  if (validated.error || !validated.data?.ok) {
    const code = String(validated.data?.failure_code ?? 'INVALID_CREDENTIAL');
    return { ok: false, message: messageForFailureCode(code), failureCode: code };
  }

  const { data, error } = await posPreviewCheckout(
    ctx.actor,
    ctx.schoolId,
    credential,
    toRpcItems(lines),
  );
  if (error || !data) return { ok: false, message: 'Could not preview checkout.' };

  const status = String(data.status ?? '');
  if (status === 'declined') {
    const code = String(data.failure_code ?? 'SYSTEM_ERROR');
    return { ok: false, message: messageForFailureCode(code), failureCode: code };
  }
  return { ok: true, preview: data };
}

export type CheckoutResult =
  | {
      ok: true;
      receiptNumber: number;
      totalCents: number;
      balanceAfterCents: number;
      learnerName: string;
      purchaseId: string;
    }
  | { ok: false; message: string; failureCode?: string; unknown?: boolean };

export async function confirmCheckoutAction(params: {
  credentialRaw: string;
  lines: BasketLine[];
  shiftId: string;
  posDeviceId: string | null;
  idempotencyKey: string;
}): Promise<CheckoutResult> {
  const ctx = await posContext();
  if ('error' in ctx) return { ok: false, message: ctx.error };

  const credential = normaliseCredentialReference(params.credentialRaw);
  const validated = await posValidateCredentialForCheckout(ctx.actor, ctx.schoolId, credential);
  if (validated.error || !validated.data?.ok) {
    const code = String(validated.data?.failure_code ?? 'INVALID_CREDENTIAL');
    return { ok: false, message: messageForFailureCode(code), failureCode: code };
  }

  const requestHash = buildCheckoutRequestHash(credential, params.lines);

  const { data, error } = await posCheckout(ctx.actor, ctx.schoolId, {
    idempotencyKey: params.idempotencyKey,
    requestHash,
    credentialReference: credential,
    items: toRpcItems(params.lines),
    shiftId: params.shiftId,
    posDeviceId: params.posDeviceId,
  });

  if (error) {
    console.error('pos_checkout RPC failed', { code: error.code });
    return {
      ok: false,
      message: 'Payment could not be completed. Try again or use “Check payment status”.',
      unknown: true,
    };
  }
  if (!data) return { ok: false, message: 'Payment could not be completed.' };

  const status = String(data.status ?? '');
  if (status === 'declined' || status === 'error') {
    const code = String(data.failure_code ?? 'SYSTEM_ERROR');
    await posLogPurchaseAttempt(ctx.actor, ctx.schoolId, {
      idempotencyKey: params.idempotencyKey,
      failureCode: code,
      cardId: null,
      learnerId: null,
      posDeviceId: params.posDeviceId,
      totalCents: null,
    });
    return { ok: false, message: messageForFailureCode(code), failureCode: code };
  }

  revalidatePath('/pos/transactions');
  revalidatePath('/parent/dashboard');
  revalidatePath('/parent/wallet');

  return {
    ok: true,
    receiptNumber: Number(data.receipt_number),
    totalCents: Number(data.total_cents),
    balanceAfterCents: Number(data.wallet_balance_after_cents),
    learnerName: String(data.learner_display_name ?? 'Learner'),
    purchaseId: String(data.purchase_id),
  };
}

export async function resolvePurchaseStatusAction(idempotencyKey: string): Promise<CheckoutResult> {
  const ctx = await posContext();
  if ('error' in ctx) return { ok: false, message: ctx.error };

  const { data, error } = await posGetPurchaseStatus(ctx.actor, ctx.schoolId, idempotencyKey);
  if (error || !data) return { ok: false, message: 'Could not check payment status.', unknown: true };

  if (data.status === 'not_found') {
    return { ok: false, message: 'No payment found for this attempt. You can try again.' };
  }

  return {
    ok: true,
    receiptNumber: Number(data.receipt_number),
    totalCents: Number(data.total_cents),
    balanceAfterCents: Number(data.wallet_balance_after_cents),
    learnerName: '',
    purchaseId: String(data.purchase_id),
  };
}
