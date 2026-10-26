import { describe, expect, it } from 'vitest';

import { normaliseCredentialReference } from '@/lib/nfc/credential';
import { buildCheckoutRequestHash } from '@/lib/pos/request-hash';

describe('POS request hash', () => {
  it('is stable regardless of item order', () => {
    const cred = 'uid:53:b9:89:cd:74:00:01';
    const a = buildCheckoutRequestHash(cred, [
      { productId: 'b', quantity: 2 },
      { productId: 'a', quantity: 1 },
    ]);
    const b = buildCheckoutRequestHash(cred, [
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 2 },
    ]);
    expect(a).toBe(b);
  });

  it('normalises UID strings', () => {
    expect(normaliseCredentialReference('UID:53:B9:89:CD:74:00:01')).toBe('uid:53:b9:89:cd:74:00:01');
  });
});
