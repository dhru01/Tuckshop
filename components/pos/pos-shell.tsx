import { PosInactivityLock } from '@/components/pos/pos-inactivity-lock';
import { PosNav } from '@/components/pos/pos-nav';
import { Brand } from '@/components/shared/brand';
import { ConnectionStatus } from '@/components/shared/connection-status';
import { StatusBadge } from '@/components/shared/status-badge';

/**
 * Minimal, full-height POS shell: large touch targets, a persistent connection indicator and
 * no unnecessary navigation (docs brief §22).
 */
export function PosShell({
  previewMode,
  children,
}: {
  previewMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-card/85 px-3 shadow-soft backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Brand compact className="sm:hidden" />
          <Brand className="hidden sm:inline-flex" />
          <PosNav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {previewMode && <StatusBadge tone="warning">UI preview</StatusBadge>}
          <ConnectionStatus />
        </div>
      </header>
      <PosInactivityLock enabled={!previewMode} />
      <main id="main" className="page-enter flex-1 p-3 sm:p-5">
        {children}
      </main>
    </div>
  );
}
