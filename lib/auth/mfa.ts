import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppRole } from '@/lib/navigation';
import { MFA_REQUIRED_ROLES } from '@/lib/auth/roles';
import type { AppEnv } from '@/lib/env/schema';
import { serverEnv } from '@/lib/env/server';

export function roleRequiresMfa(role: AppRole): boolean {
  return MFA_REQUIRED_ROLES.has(role);
}

/** MFA is mandatory for privileged roles only in staging/production. */
export function mfaEnforcedInEnvironment(appEnv: AppEnv): boolean {
  return appEnv === 'staging' || appEnv === 'production';
}

/** Returns true when the session has completed MFA (AAL2). */
export async function sessionHasAal2(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal2';
}

export async function assertMfaSatisfied(
  supabase: SupabaseClient,
  role: AppRole,
): Promise<boolean> {
  if (!roleRequiresMfa(role)) return true;
  if (!mfaEnforcedInEnvironment(serverEnv().APP_ENV)) return true;
  return sessionHasAal2(supabase);
}
