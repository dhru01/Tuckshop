import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AppRole } from '@/lib/navigation';

/** Cookie payload version – bump when shape changes. */
export const ACTIVE_CONTEXT_COOKIE = 'tuckshop_active_context';
export const ACTIVE_CONTEXT_VERSION = 1;

export type ActiveContextPayload = {
  v: number;
  role: AppRole;
  /** Null for parent (cross-school) and super_admin. */
  schoolId: string | null;
};

function encodePayload(payload: ActiveContextPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): ActiveContextPayload | null {
  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as ActiveContextPayload;
    if (parsed.v !== ACTIVE_CONTEXT_VERSION) return null;
    if (!parsed.role) return null;
    if (parsed.schoolId !== null && typeof parsed.schoolId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function signActiveContext(payload: ActiveContextPayload, secret: string): string {
  const body = encodePayload(payload);
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyActiveContext(
  value: string,
  secret: string,
): ActiveContextPayload | null {
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return decodePayload(body);
}

export function contextSigningSecret(server: { AUTH_CONTEXT_SECRET?: string; SUPABASE_SECRET_KEY: string }): string {
  return server.AUTH_CONTEXT_SECRET ?? server.SUPABASE_SECRET_KEY;
}
