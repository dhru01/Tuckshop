import 'server-only';

import { cookies } from 'next/headers';

import {
  ACTIVE_CONTEXT_COOKIE,
  ACTIVE_CONTEXT_VERSION,
  contextSigningSecret,
  signActiveContext,
  verifyActiveContext,
  type ActiveContextPayload,
} from '@/lib/auth/active-context';
import type { RoleContext } from '@/lib/auth/context-types';
import { matchesContext } from '@/lib/auth/load-contexts';
import { serverEnv } from '@/lib/env/server';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
};

export async function readActiveContextCookie(): Promise<RoleContext | null> {
  const raw = (await cookies()).get(ACTIVE_CONTEXT_COOKIE)?.value;
  if (!raw) return null;
  const secret = contextSigningSecret(serverEnv());
  const payload = verifyActiveContext(raw, secret);
  if (!payload) return null;
  return payloadToContext(payload);
}

export async function writeActiveContextCookie(context: RoleContext): Promise<void> {
  const secret = contextSigningSecret(serverEnv());
  const payload: ActiveContextPayload = {
    v: ACTIVE_CONTEXT_VERSION,
    role: context.role,
    schoolId: context.schoolId,
  };
  const value = signActiveContext(payload, secret);
  (await cookies()).set(ACTIVE_CONTEXT_COOKIE, value, COOKIE_OPTIONS);
}

export async function clearActiveContextCookie(): Promise<void> {
  (await cookies()).set(ACTIVE_CONTEXT_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

function payloadToContext(payload: ActiveContextPayload): RoleContext {
  return {
    role: payload.role,
    schoolId: payload.schoolId,
    schoolName: null,
    schoolStatus: null,
  };
}

export function pickActiveContext(
  allowed: RoleContext[],
  preference: RoleContext | null,
): RoleContext | null {
  if (preference) {
    const match = allowed.find((c) => matchesContext(c, preference));
    if (match) return match;
  }
  if (allowed.length === 1) return allowed[0] ?? null;
  return null;
}
