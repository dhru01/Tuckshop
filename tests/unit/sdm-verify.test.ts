import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { encodePilotPicc, verifyNtag424SdmTap } from '@/lib/nfc/sdm-verify';

const KEY = 'a'.repeat(64);

describe('verifyNtag424SdmTap (pilot stub)', () => {
  it('accepts a valid pilot tap', () => {
    const uid = '53:b9:89:cd:74:00:01';
    const picc = encodePilotPicc(uid, 42);
    const mac = createHmac('sha256', Buffer.from(KEY, 'hex'))
      .update(uid)
      .update('42')
      .digest('hex')
      .slice(0, 16);

    const result = verifyNtag424SdmTap({ piccData: picc, cmac: mac }, KEY);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.uid).toBe(uid);
      expect(result.readCounter).toBe(42);
    }
  });

  it('rejects bad mac', () => {
    const picc = encodePilotPicc('aa', 1);
    const result = verifyNtag424SdmTap({ piccData: picc, cmac: 'deadbeefdeadbeef' }, KEY);
    expect(result.ok).toBe(false);
  });
});
