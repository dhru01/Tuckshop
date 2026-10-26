import { Store } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Placeholder brand mark (decision D-16: final name/logo pending). */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Store className="size-4.5" aria-hidden="true" />
      </span>
      {!compact && <span className="text-base">Tuckshop</span>}
    </span>
  );
}
