import type { RoleContext } from '@/lib/auth/context-types';
import { defaultDashboardPath } from '@/lib/auth/roles';

/**
 * Where to send the user immediately after a successful sign-in.
 */
export function resolvePostLoginPath(contexts: RoleContext[], next?: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  if (contexts.length === 0) return '/no-access?reason=membership';
  if (contexts.length > 1) return '/select-context';
  const first = contexts[0];
  return first ? defaultDashboardPath(first.role) : '/no-access?reason=membership';
}
