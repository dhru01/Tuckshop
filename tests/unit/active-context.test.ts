import { describe, expect, it } from 'vitest';

import {
  signActiveContext,
  verifyActiveContext,
  ACTIVE_CONTEXT_VERSION,
} from '@/lib/auth/active-context';

describe('active context cookie', () => {
  const secret = 'test-secret-at-least-thirty-two-chars!!';

  it('round-trips a signed payload', () => {
    const signed = signActiveContext(
      { v: ACTIVE_CONTEXT_VERSION, role: 'parent', schoolId: null },
      secret,
    );
    const parsed = verifyActiveContext(signed, secret);
    expect(parsed).toEqual({ v: ACTIVE_CONTEXT_VERSION, role: 'parent', schoolId: null });
  });

  it('rejects tampered signatures', () => {
    const signed = signActiveContext(
      { v: ACTIVE_CONTEXT_VERSION, role: 'super_admin', schoolId: null },
      secret,
    );
    const tampered = `${signed}x`;
    expect(verifyActiveContext(tampered, secret)).toBeNull();
    expect(verifyActiveContext(signed, 'wrong-secret-at-least-thirty-two!!')).toBeNull();
  });
});
