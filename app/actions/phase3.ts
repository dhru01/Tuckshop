'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { writeActiveContextCookie } from '@/lib/auth/context-cookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  activateSchool,
  approveGuardianLink,
  createLearnerWithWallet,
  createParentInvitation,
  enablePilotNfcUid,
  onboardSchool,
  registerCardUid,
  acceptParentInvitation,
} from '@/services/tenancy-service';

export type ActionState = { error?: string; success?: string; inviteUrl?: string };

export async function onboardSchoolAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await requireActorForInterface('admin');
  const name = String(formData.get('name') ?? '').trim();
  const schoolCode = String(formData.get('schoolCode') ?? '').trim();
  const adminEmail = String(formData.get('adminEmail') ?? '').trim();

  const { data, error } = await onboardSchool(actorId(access), {
    name,
    schoolCode,
    initialAdminEmail: adminEmail || undefined,
  });
  if (error || !data) {
    return { error: 'Could not create school. Check the code is unique.' };
  }

  const { error: actErr } = await activateSchool(actorId(access), data.school_id);
  if (actErr) {
    return { error: 'School created but could not activate it.' };
  }

  revalidatePath('/admin/schools');
  return { success: `School “${name}” is active. School admin: ${data.admin_assigned ? 'assigned' : 'not found — register that email first'}.` };
}

export async function createLearnerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school in your current context.' };

  const guardianEmail = String(formData.get('guardianEmail') ?? '').trim().toLowerCase();

  const { data, error } = await createLearnerWithWallet(actorId(access), schoolId, {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    grade: String(formData.get('grade') ?? ''),
    className: String(formData.get('className') ?? ''),
    admissionRef: String(formData.get('admissionRef') ?? '').trim() || undefined,
  });
  if (error || !data) return { error: 'Could not add learner. Is the school active?' };

  if (guardianEmail) {
    const { data: inv, error: invErr } = await createParentInvitation(
      actorId(access),
      schoolId,
      data.learner_id,
      guardianEmail,
    );
    if (invErr || !inv) {
      revalidatePath('/school/learners');
      return {
        error: 'Learner added but could not create parent invite. Add invite from Parents.',
        success: `Learner ${data.admission_ref} created.`,
      };
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    revalidatePath('/school/learners');
    revalidatePath('/school/parents');
    return {
      success: `Learner added (${data.admission_ref}). Share the invite link with the caregiver.`,
      inviteUrl: `${base}/invite/${inv.token}`,
    };
  }

  revalidatePath('/school/learners');
  return { success: `Learner added (${data.admission_ref}).` };
}

export async function inviteParentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school in your current context.' };

  const learnerId = String(formData.get('learnerId') ?? '');
  const email = String(formData.get('email') ?? '').trim();

  const { data, error } = await createParentInvitation(actorId(access), schoolId, learnerId, email);
  if (error || !data) return { error: 'Could not create invitation.' };

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const inviteUrl = `${base}/invite/${data.token}`;
  revalidatePath('/school/parents');
  return { success: 'Invitation created. Share this link with the parent (shown once).', inviteUrl };
}

export async function acceptInviteAction(token: string): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${token}`);

  const { data, error } = await acceptParentInvitation(user.id, token);
  if (error || !data) {
    return { error: 'This invitation is invalid, expired, or not for your email.' };
  }

  revalidatePath('/parent/children');
  if (data.status === 'active') {
    return { success: 'You are now linked to your child.' };
  }
  return { success: 'Link submitted — waiting for school approval.' };
}

export async function acceptInviteFormAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get('token') ?? '');
  return acceptInviteAction(token);
}

export async function approveGuardianAction(relationshipId: string): Promise<ActionState> {
  const access = await requireActorForInterface('school');
  const { error } = await approveGuardianLink(actorId(access), relationshipId);
  if (error) return { error: 'Could not approve link.' };
  revalidatePath('/school/parents');
  return { success: 'Guardian link approved.' };
}

export async function approveGuardianFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get('relationshipId') ?? '');
  await approveGuardianAction(id);
}

export async function enablePilotNfcAction(): Promise<ActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };
  const { error } = await enablePilotNfcUid(actorId(access), schoolId);
  if (error) return { error: 'Could not enable pilot NFC mode.' };
  revalidatePath('/school/cards');
  return { success: 'UID-only pilot cards enabled for this school (dev only).' };
}

export async function enablePilotNfcFormAction(): Promise<void> {
  await enablePilotNfcAction();
}

export async function registerCardUidAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' };

  const learnerId = String(formData.get('learnerId') ?? '');
  const uid = String(formData.get('uid') ?? '').trim();

  const { error } = await registerCardUid(actorId(access), schoolId, learnerId, uid);
  if (error) return { error: 'Could not register card. Enable pilot NFC and check the UID.' };

  revalidatePath('/school/cards');
  return { success: 'Card registered and linked to learner.' };
}

export async function switchToSchoolContextAction(schoolId: string): Promise<void> {
  const access = await requireActorForInterface('school');
  const match = access.contexts.find((c) => c.role === 'school_admin' && c.schoolId === schoolId);
  if (!match) redirect('/no-access');
  await writeActiveContextCookie(match);
  redirect('/school/learners');
}
