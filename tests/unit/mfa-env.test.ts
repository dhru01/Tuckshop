import { describe, expect, it } from 'vitest';

import { mfaEnforcedInEnvironment } from '@/lib/auth/mfa';

describe('mfaEnforcedInEnvironment', () => {
  it('is relaxed for local pilot environments', () => {
    expect(mfaEnforcedInEnvironment('development')).toBe(false);
    expect(mfaEnforcedInEnvironment('test')).toBe(false);
  });

  it('is required for deployed environments', () => {
    expect(mfaEnforcedInEnvironment('staging')).toBe(true);
    expect(mfaEnforcedInEnvironment('production')).toBe(true);
  });
});
