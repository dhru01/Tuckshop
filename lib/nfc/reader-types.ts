export type CredentialProof =
  | { scheme: 'simulated'; simulatedCardId: string }
  | { scheme: 'uid_only'; uid: string }
  | { scheme: 'ntag424_sdm'; piccData: string; cmac: string; readCounter?: number }
  | { scheme: 'desfire_ev3'; sessionProof: string };

export type ReaderStatus = 'disconnected' | 'connecting' | 'ready' | 'reading' | 'error';

export type ReaderErrorCode =
  | 'READER_DISCONNECTED'
  | 'READ_TIMEOUT'
  | 'UNSUPPORTED_CARD'
  | 'PERMISSION_DENIED'
  | 'CANCELLED';

export class ReaderError extends Error {
  readonly code: ReaderErrorCode;

  constructor(code: ReaderErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface CardReader {
  readonly kind: 'simulated' | 'web_nfc' | 'pcsc_bridge' | 'keyboard_wedge' | 'serial';
  readonly environmentAllowed: boolean;
  status(): ReaderStatus;
  onStatusChange(cb: (status: ReaderStatus) => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  waitForCard(opts: { timeoutMs: number; signal?: AbortSignal }): Promise<CredentialProof>;
}
