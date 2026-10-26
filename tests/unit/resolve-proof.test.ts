import { describe, expect, it } from 'vitest';

import { credentialReferenceFromProof } from '@/lib/nfc/resolve-proof';

describe('credentialReferenceFromProof', () => {
  it('normalises uid_only proof', () => {
    const ref = credentialReferenceFromProof({ scheme: 'uid_only', uid: '53b989cd740001' });
    expect(ref).toBe('uid:53:b9:89:cd:74:00:01');
  });
});
