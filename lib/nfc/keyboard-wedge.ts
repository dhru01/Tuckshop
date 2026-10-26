/**
 * Captures keyboard-wedge scanner input (prefix/suffix optional).
 * Many UID-only wedges emit hex + Enter; SDM wedges may emit a URL string.
 */
export function parseKeyboardWedgeInput(raw: string): { scheme: 'uid_only'; uid: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return null;
  }

  const hex = trimmed.replace(/[^0-9a-f:]/gi, '');
  if (hex.length >= 8) {
    return { scheme: 'uid_only', uid: hex };
  }

  return null;
}
