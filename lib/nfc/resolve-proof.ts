import type { CredentialProof } from '@/lib/nfc/reader-types';
import { normaliseCredentialReference } from '@/lib/nfc/credential';

/**
 * Maps a reader proof to the credential_reference stored on `nfc_cards`.
 * SDM verification happens server-side before this mapping in production.
 */
export function credentialReferenceFromProof(proof: CredentialProof): string {
  switch (proof.scheme) {
    case 'uid_only':
      return normaliseCredentialReference(proof.uid);
    case 'simulated':
      return normaliseCredentialReference(proof.simulatedCardId);
    case 'ntag424_sdm':
      // Verified server-side; reference derived after crypto verify (placeholder: picc hash prefix in dev)
      return `sdm:${proof.piccData.slice(0, 32).toLowerCase()}`;
    case 'desfire_ev3':
      return `desfire:${proof.sessionProof.slice(0, 32).toLowerCase()}`;
    default:
      return '';
  }
}
