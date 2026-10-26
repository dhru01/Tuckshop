/**
 * Normalise a scanned or simulated UID into the stored credential_reference format.
 * Pilot UID-only cards use `uid:<hex-with-colons>`.
 */
export function normaliseCredentialReference(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith('uid:')) return trimmed;
  const hex = trimmed.replace(/[^0-9a-f]/gi, '');
  if (hex.length >= 8) {
    const pairs = hex.match(/.{1,2}/g);
    if (pairs) return `uid:${pairs.join(':')}`;
  }
  return trimmed;
}
