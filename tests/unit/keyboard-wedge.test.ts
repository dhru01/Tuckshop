import { describe, expect, it } from 'vitest';

import { parseKeyboardWedgeInput } from '@/lib/nfc/keyboard-wedge';

describe('parseKeyboardWedgeInput', () => {
  it('parses colon-separated uid', () => {
    expect(parseKeyboardWedgeInput('53:b9:89:cd:74:00:01')?.uid).toContain('53');
  });

  it('ignores http urls (sdm)', () => {
    expect(parseKeyboardWedgeInput('https://example.com/tap?e=1')).toBeNull();
  });
});
