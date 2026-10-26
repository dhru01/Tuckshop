'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { parseRandToCents } from '@/lib/wallets/money';
import { pilotFundWallet } from '@/services/ledger-service';

export type LedgerActionState = { error?: string; success?: string; balanceAfter?: string };

export async function pilotFundWalletAction(
  _prev: LedgerActionState,
  formData: FormData,
): Promise<LedgerActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };

  const walletId = String(formData.get('walletId') ?? '');
  const reason = String(formData.get('reason') ?? 'Pilot credit').trim();
  const amountRaw = String(formData.get('amount') ?? '');
  const cents = parseRandToCents(amountRaw);
  if (cents === null || cents <= 0) {
    return { error: 'Enter a valid amount in rand (e.g. 50 or 50.00).' };
  }

  const idempotencyKey = `pilot:${walletId}:${randomUUID()}`;
  const { data, error } = await pilotFundWallet(
    actorId(access),
    walletId,
    cents,
    reason,
    idempotencyKey,
  );

  if (error || !data) {
    return { error: 'Could not credit wallet. Check the learner wallet exists.' };
  }

  revalidatePath('/school/learners');
  revalidatePath('/parent/dashboard');
  revalidatePath('/parent/wallet');

  const balance = (data.balance_cents / 100).toFixed(2);
  return {
    success: `Wallet credited. New balance: R${balance}.`,
    balanceAfter: balance,
  };
}
