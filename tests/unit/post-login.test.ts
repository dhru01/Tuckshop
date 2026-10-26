import { describe, expect, it } from 'vitest';

import { resolvePostLoginPath } from '@/lib/auth/post-login';
import type { RoleContext } from '@/lib/auth/context-types';

const parentCtx: RoleContext = {
  role: 'parent',
  schoolId: null,
  schoolName: null,
  schoolStatus: null,
};

describe('resolvePostLoginPath', () => {
  it('honours a safe next path', () => {
    expect(resolvePostLoginPath([parentCtx], '/parent/wallet')).toBe('/parent/wallet');
  });

  it('rejects protocol-relative next paths', () => {
    expect(resolvePostLoginPath([parentCtx], '//evil.test')).toBe('/parent/dashboard');
  });

  it('sends multi-role users to context selection', () => {
    const cashier: RoleContext = {
      role: 'cashier',
      schoolId: '00000000-0000-4000-8000-000000000001',
      schoolName: 'Demo',
      schoolStatus: 'active',
    };
    expect(resolvePostLoginPath([parentCtx, cashier])).toBe('/select-context');
  });
});
