import { createHmac, timingSafeEqual } from 'node:crypto';

export type SdmTapPayload = {
  piccData: string;
  cmac: string;
};

export type SdmVerifyResult =
  | { ok: true; uid: string; readCounter: number }
  | { ok: false; code: 'INVALID_PAYLOAD' | 'INVALID_MAC' | 'KEY_UNAVAILABLE' };

/**
 * NTAG 424 DNA SDM verification (simplified). Production requires NXP test vectors and
 * per-card diversified keys — see docs/NFC_INTEGRATION.md and docs/HARDWARE_SPIKE.md.
 */
export function verifyNtag424SdmTap(
  payload: SdmTapPayload,
  masterKeyHex: string | undefined,
): SdmVerifyResult {
  if (!payload.piccData?.trim() || !payload.cmac?.trim()) {
    return { ok: false, code: 'INVALID_PAYLOAD' };
  }
  if (!masterKeyHex || masterKeyHex.length < 32) {
    return { ok: false, code: 'KEY_UNAVAILABLE' };
  }

  // Pilot stub: piccData encodes `uid|counter` as hex for dev fixtures only.
  const decoded = decodePilotPicc(payload.piccData);
  if (!decoded) {
    return { ok: false, code: 'INVALID_PAYLOAD' };
  }

  const expectedMac = createHmac('sha256', Buffer.from(masterKeyHex, 'hex'))
    .update(decoded.uid)
    .update(String(decoded.readCounter))
    .digest('hex')
    .slice(0, 16);

  const provided = payload.cmac.replace(/[^0-9a-f]/gi, '').slice(0, 16).toLowerCase();
  if (provided.length < 16) {
    return { ok: false, code: 'INVALID_MAC' };
  }

  try {
    const a = Buffer.from(expectedMac, 'hex');
    const b = Buffer.from(provided.padEnd(16, '0'), 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, code: 'INVALID_MAC' };
    }
  } catch {
    return { ok: false, code: 'INVALID_MAC' };
  }

  return { ok: true, uid: decoded.uid, readCounter: decoded.readCounter };
}

/** Dev-only encoding helper for integration tests (not used on real cards). */
export function encodePilotPicc(uid: string, readCounter: number): string {
  return Buffer.from(`${uid}|${readCounter}`, 'utf8').toString('hex');
}

function decodePilotPicc(piccHex: string): { uid: string; readCounter: number } | null {
  try {
    const raw = Buffer.from(piccHex.replace(/[^0-9a-f]/gi, ''), 'hex').toString('utf8');
    const [uid, counter] = raw.split('|');
    if (!uid || counter === undefined) return null;
    const readCounter = Number.parseInt(counter, 10);
    if (!Number.isFinite(readCounter)) return null;
    return { uid, readCounter };
  } catch {
    return null;
  }
}
