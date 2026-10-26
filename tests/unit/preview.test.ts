import { describe, expect, it } from 'vitest';

import { computeUiPreview } from '@/lib/auth/preview';

describe('UI shell preview (fails closed)', () => {
  it('is off by default', () => {
    expect(computeUiPreview({})).toBe(false);
    expect(computeUiPreview({ APP_ENV: 'development' })).toBe(false);
  });

  it('turns on only when explicitly requested outside production', () => {
    expect(computeUiPreview({ UI_SHELL_PREVIEW: 'true', APP_ENV: 'development' })).toBe(true);
    expect(computeUiPreview({ UI_SHELL_PREVIEW: '1', APP_ENV: 'test' })).toBe(true);
  });

  it('is always off in production, even if requested', () => {
    expect(computeUiPreview({ UI_SHELL_PREVIEW: 'true', APP_ENV: 'production' })).toBe(false);
  });

  it.each(['false', '0', '', 'TRUE', 'yes', ' '])('treats %j as off', (v) => {
    expect(computeUiPreview({ UI_SHELL_PREVIEW: v, APP_ENV: 'development' })).toBe(false);
  });
});
