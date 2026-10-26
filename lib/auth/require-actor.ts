import 'server-only';

import { redirect } from 'next/navigation';

import type { AuthenticatedAccess } from '@/lib/auth/context-types';
import { requireContext, type InterfaceAccess } from '@/lib/auth/context';

export async function requireActorForInterface(
  interfaceKey: 'admin' | 'school' | 'parent' | 'pos',
): Promise<AuthenticatedAccess> {
  const access = await requireContext(interfaceKey);
  if (access.kind === 'preview') {
    redirect('/login');
  }
  return access;
}

export function actorId(access: InterfaceAccess): string {
  if (access.kind !== 'authenticated') {
    throw new Error('actor_required');
  }
  return access.user.id;
}
