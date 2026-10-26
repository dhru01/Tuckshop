import 'server-only';

import { requireContext, type InterfaceAccess } from '@/lib/auth/context';
import type { InterfaceKey } from '@/lib/navigation';

export type { InterfaceAccess };

/**
 * Server-side gate for each role interface. Delegates to `requireContext()`.
 */
export async function requireInterface(interfaceKey: InterfaceKey): Promise<InterfaceAccess> {
  return requireContext(interfaceKey);
}
