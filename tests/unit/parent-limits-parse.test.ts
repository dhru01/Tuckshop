import { describe, expect, it } from 'vitest';

import { parseRandToCents } from '@/lib/wallets/money';

describe('parent spending limit parsing', () => {
  it('parses rand amounts to cents for form input', () => {
    expect(parseRandToCents('50')).toBe(5000);
    expect(parseRandToCents('12.50')).toBe(1250);
  });
});
