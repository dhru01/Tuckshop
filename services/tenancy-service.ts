import 'server-only';

import { callRpc } from '@/services/rpc';

export async function onboardSchool(
  actorId: string,
  input: {
    name: string;
    schoolCode: string;
    province?: string;
    contactEmail?: string;
    initialAdminEmail?: string;
  },
) {
  return callRpc<{
    school_id: string;
    school_code: string;
    admin_assigned: boolean;
  }>('onboard_school', {
    p_actor_id: actorId,
    p_name: input.name,
    p_school_code: input.schoolCode,
    p_province: input.province ?? 'gauteng',
    p_contact_email: input.contactEmail ?? null,
    p_initial_admin_email: input.initialAdminEmail ?? null,
  });
}

export async function activateSchool(actorId: string, schoolId: string, reason?: string) {
  return callRpc<void>('activate_school', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_reason: reason ?? 'Pilot activation',
  });
}

export async function createLearnerWithWallet(
  actorId: string,
  schoolId: string,
  input: {
    firstName: string;
    lastName: string;
    grade: string;
    className?: string;
    admissionRef?: string;
  },
) {
  return callRpc<{ learner_id: string; wallet_id: string; admission_ref: string }>(
    'create_learner_with_wallet',
    {
      p_actor_id: actorId,
      p_school_id: schoolId,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_grade: input.grade,
      p_class_name: input.className ?? null,
      p_admission_ref: input.admissionRef ?? null,
    },
  );
}

export async function createParentInvitation(
  actorId: string,
  schoolId: string,
  learnerId: string,
  invitedEmail: string,
) {
  return callRpc<{ invitation_id: string; token: string }>('create_parent_invitation', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_learner_id: learnerId,
    p_invited_email: invitedEmail,
    p_relationship: 'guardian',
  });
}

export async function acceptParentInvitation(actorId: string, token: string) {
  return callRpc<{
    relationship_id: string;
    status: string;
    learner_id: string;
    school_id: string;
  }>('accept_parent_invitation', {
    p_actor_id: actorId,
    p_token: token,
  });
}

export async function approveGuardianLink(actorId: string, relationshipId: string) {
  return callRpc<void>('approve_guardian_link', {
    p_actor_id: actorId,
    p_relationship_id: relationshipId,
  });
}

export async function enablePilotNfcUid(actorId: string, schoolId: string) {
  return callRpc<void>('enable_pilot_nfc_uid', {
    p_actor_id: actorId,
    p_school_id: schoolId,
  });
}

export async function registerCardUid(
  actorId: string,
  schoolId: string,
  learnerId: string,
  uid: string,
  cardNumber?: string,
) {
  return callRpc<{ card_id: string }>('register_card_uid_for_learner', {
    p_actor_id: actorId,
    p_school_id: schoolId,
    p_learner_id: learnerId,
    p_uid: uid,
    p_card_number: cardNumber ?? null,
  });
}
