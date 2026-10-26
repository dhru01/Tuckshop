'use server';

import { revalidatePath } from 'next/cache';

import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { parseRandToCents } from '@/lib/wallets/money';
import { setCardFrozen, setSpendingLimits } from '@/services/parent-portal-service';

export type ParentActionState = { error?: string; success?: string };

function parseOptionalLimit(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return null;
  const cents = parseRandToCents(trimmed);
  if (cents === null) return null;
  return cents;
}

export async function updateSpendingLimitsAction(
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const access = await requireActorForInterface('parent');
  const learnerId = String(formData.get('learnerId') ?? '');
  const dailyRaw = String(formData.get('dailyLimit') ?? '');
  const weeklyRaw = String(formData.get('weeklyLimit') ?? '');

  const daily = parseOptionalLimit(dailyRaw);
  const weekly = parseOptionalLimit(weeklyRaw);
  if (dailyRaw.trim() && daily === null && dailyRaw.trim().toLowerCase() !== 'none') {
    return { error: 'Daily limit must be a valid amount (e.g. 50 or 50.00).' };
  }
  if (weeklyRaw.trim() && weekly === null && weeklyRaw.trim().toLowerCase() !== 'none') {
    return { error: 'Weekly limit must be a valid amount (e.g. 200 or 200.00).' };
  }

  const { error } = await setSpendingLimits(actorId(access), learnerId, daily, weekly);
  if (error) return { error: 'Could not save limits. Check you have permission for this child.' };

  revalidatePath('/parent/spending-controls');
  revalidatePath('/parent/dashboard');
  revalidatePath(`/parent/children/${learnerId}`);
  return { success: 'Spending limits updated.' };
}

export async function toggleCardFreezeAction(
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const access = await requireActorForInterface('parent');
  const cardId = String(formData.get('cardId') ?? '');
  const frozen = formData.get('frozen') === 'true';

  const { error } = await setCardFrozen(actorId(access), cardId, frozen);
  if (error) {
    return { error: frozen ? 'Could not freeze card.' : 'Could not unfreeze card.' };
  }

  revalidatePath('/parent/children');
  revalidatePath('/parent/dashboard');
  revalidatePath('/parent/spending-controls');
  return { success: frozen ? 'Card frozen.' : 'Card active again.' };
}
