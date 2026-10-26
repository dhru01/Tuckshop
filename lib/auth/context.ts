import 'server-only';

import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import {
  clearActiveContextCookie,
  pickActiveContext,
  readActiveContextCookie,
} from '@/lib/auth/context-cookie';
import type { AuthenticatedAccess } from '@/lib/auth/context-types';
import {
  contextsForInterface,
  loadProfile,
  loadRoleContexts,
} from '@/lib/auth/load-contexts';
import { assertMfaSatisfied } from '@/lib/auth/mfa';
import { isUiPreviewEnabled } from '@/lib/auth/preview';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { INTERFACES, type InterfaceKey } from '@/lib/navigation';

export type PreviewAccess = { kind: 'preview'; interfaceKey: InterfaceKey };

export type InterfaceAccess = PreviewAccess | AuthenticatedAccess;

function loginRedirect(nextPath?: string): never {
  const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
  redirect(`/login${q}`);
}

/**
 * Authoritative server gate for role interfaces. Re-validates session, assignments, school status,
 * MFA and the signed active-context cookie on every request.
 */
export async function requireContext(interfaceKey: InterfaceKey): Promise<InterfaceAccess> {
  await connection();

  if (isUiPreviewEnabled()) {
    return { kind: 'preview', interfaceKey };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    loginRedirect(INTERFACES[interfaceKey].basePath);
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  const profile = await loadProfile(supabase, user.id);
  if (!profile || profile.status === 'disabled') {
    redirect('/no-access?reason=disabled');
  }

  const contexts = await loadRoleContexts(supabase, user.id);
  const allowed = contextsForInterface(contexts, INTERFACES[interfaceKey].roles);

  if (allowed.length === 0) {
    redirect('/no-access?reason=membership');
  }

  const preference = await readActiveContextCookie();
  const active = pickActiveContext(allowed, preference);

  if (!active) {
    redirect(`/select-context?next=${encodeURIComponent(INTERFACES[interfaceKey].basePath)}`);
  }

  if (
    active.schoolStatus === 'suspended' &&
    (active.role === 'cashier' || active.role === 'school_admin')
  ) {
    redirect('/school-suspended');
  }

  if (active.schoolStatus === 'deactivated' && active.schoolId) {
    redirect('/no-access?reason=school');
  }

  const mfaOk = await assertMfaSatisfied(supabase, active.role);
  if (!mfaOk) {
    redirect(
      `/mfa?next=${encodeURIComponent(INTERFACES[interfaceKey].basePath)}&role=${active.role}`,
    );
  }

  const enriched = allowed.find((c) => c.role === active.role && c.schoolId === active.schoolId);
  const activeEnriched = enriched ?? active;

  return {
    kind: 'authenticated',
    user,
    profile,
    active: activeEnriched,
    contexts,
  };
}

export async function requireUser(): Promise<AuthenticatedAccess | null> {
  await connection();
  if (isUiPreviewEnabled()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) return null;

  const profile = await loadProfile(supabase, user.id);
  if (!profile || profile.status === 'disabled') return null;

  const contexts = await loadRoleContexts(supabase, user.id);
  const preference = await readActiveContextCookie();
  const active = pickActiveContext(contexts, preference) ?? contexts[0];
  if (!active) return null;

  return { kind: 'authenticated', user, profile, active, contexts };
}

export async function signOutEverywhere(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearActiveContextCookie();
}
