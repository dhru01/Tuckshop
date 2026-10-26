import type { CardReader, CredentialProof, ReaderStatus } from '@/lib/nfc/reader-types';
import { ReaderError } from '@/lib/nfc/reader-types';

export class SimulatedReader implements CardReader {
  readonly kind = 'simulated' as const;
  readonly environmentAllowed: boolean;

  private statusValue: ReaderStatus = 'disconnected';
  private listeners = new Set<(s: ReaderStatus) => void>();

  constructor(environmentAllowed: boolean) {
    this.environmentAllowed = environmentAllowed;
  }

  status(): ReaderStatus {
    return this.statusValue;
  }

  onStatusChange(cb: (status: ReaderStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setStatus(next: ReaderStatus) {
    this.statusValue = next;
    for (const cb of this.listeners) cb(next);
  }

  async connect(): Promise<void> {
    if (!this.environmentAllowed) {
      throw new ReaderError('PERMISSION_DENIED', 'Simulated reader is disabled in this environment.');
    }
    this.setStatus('ready');
  }

  async disconnect(): Promise<void> {
    this.setStatus('disconnected');
  }

  async waitForCard(opts: { timeoutMs: number; signal?: AbortSignal }): Promise<CredentialProof> {
    if (!this.environmentAllowed) {
      throw new ReaderError('PERMISSION_DENIED');
    }
    if (this.statusValue !== 'ready') {
      throw new ReaderError('READER_DISCONNECTED');
    }

    return new Promise<CredentialProof>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(new ReaderError('CANCELLED'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new ReaderError('READ_TIMEOUT'));
      }, opts.timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        opts.signal?.removeEventListener('abort', onAbort);
        window.removeEventListener('tuckshop:simulated-tap', onTap);
        this.setStatus('ready');
      };

      const onTap = (event: Event) => {
        const detail = (event as CustomEvent<{ uid: string }>).detail;
        if (!detail?.uid) return;
        cleanup();
        resolve({ scheme: 'uid_only', uid: detail.uid });
      };

      opts.signal?.addEventListener('abort', onAbort);
      this.setStatus('reading');
      window.addEventListener('tuckshop:simulated-tap', onTap as EventListener);
    });
  }
}

export function emitSimulatedTap(uid: string) {
  window.dispatchEvent(new CustomEvent('tuckshop:simulated-tap', { detail: { uid } }));
}
