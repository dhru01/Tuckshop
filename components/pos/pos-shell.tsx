import Link from 'next/link';

import { PosInactivityLock } from '@/components/pos/pos-inactivity-lock';
import { Brand } from '@/components/shared/brand';
import { ConnectionStatus } from '@/components/shared/connection-status';
import { StatusBadge } from '@/components/shared/status-badge';
import { INTERFACES } from '@/lib/navigation';

/**
 * Minimal, full-height POS shell: large touch targets, a persistent connection indicator and
 * no unnecessary navigation (docs brief §22). The POS itself arrives in Phase 7.
 */
export function PosShell({
  previewMode,
  children,
}: {
  previewMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background px-4">
        <div className="flex items-center gap-4">
          <Brand />
          <nav aria-label="POS navigation" className="hidden items-center gap-1 sm:flex">
            {INTERFACES.pos.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {previewMode && <StatusBadge tone="warning">UI preview</StatusBadge>}
          <ConnectionStatus />
        </div>
      </header>
      <PosInactivityLock enabled={!previewMode} />
      <main id="main" className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
