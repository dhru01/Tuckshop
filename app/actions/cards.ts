'use server';

import { revalidatePath } from 'next/cache';

import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { normaliseCredentialReference } from '@/lib/nfc/credential';
import { schoolReplaceCardUid, schoolSetCardStatus } from '@/services/card-service';

export type CardActionState = { error?: string; success?: string };

const ADMIN_STATUSES = new Set(['lost', 'stolen', 'deactivated', 'frozen', 'active']);

export async function schoolSetCardStatusAction(
  cardId: string,
  newStatus: string,
  reason: string,
): Promise<CardActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };
  if (!ADMIN_STATUSES.has(newStatus)) return { error: 'Invalid status.' };

  const { error } = await schoolSetCardStatus(actorId(access), schoolId, cardId, newStatus, reason);
  if (error) return { error: 'Could not update card status.' };

  revalidatePath('/school/cards');
  return { success: `Card marked as ${newStatus}.` };
}

export async function schoolReplaceCardAction(
  oldCardId: string,
  newUidRaw: string,
  reason: string,
): Promise<CardActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };

  const uid = normaliseCredentialReference(newUidRaw).replace(/^uid:/, '');
  if (uid.length < 4) return { error: 'Enter a valid card UID.' };

  const { data, error } = await schoolReplaceCardUid(
    actorId(access),
    schoolId,
    oldCardId,
    uid,
    reason,
  );
  if (error || !data) return { error: 'Could not replace card. Check UID and school pilot settings.' };

  revalidatePath('/school/cards');
  return { success: 'Replacement card registered; old card is retired.' };
}
