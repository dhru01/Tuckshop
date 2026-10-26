import { cn } from '@/lib/utils';

/** FirstByte logomark: a 2×2 "byte" of tiles, one highlighted in amber. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-brand-gradient relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl shadow-soft ring-1 ring-white/10',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.2" fill="white" fillOpacity="0.95" />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="2.2" fill="white" fillOpacity="0.55" />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="2.2" fill="white" fillOpacity="0.55" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="2.2" fill="oklch(0.82 0.16 84)" />
      </svg>
    </span>
  );
}

/**
 * FirstByte Tuckshop wordmark.
 * `tone="light"` is for use on the dark ink sidebar / hero panels.
 */
export function Brand({
  className,
  compact = false,
  tone = 'default',
}: {
  className?: string;
  compact?: boolean;
  tone?: 'default' | 'light';
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-heading text-[0.95rem] font-extrabold tracking-tight',
              tone === 'light' ? 'text-white' : 'text-foreground',
            )}
          >
            FirstByte
          </span>
          <span
            className={cn(
              'mt-0.5 text-[0.65rem] font-semibold tracking-[0.18em] uppercase',
              tone === 'light' ? 'text-sidebar-muted' : 'text-muted-foreground',
            )}
          >
            Tuckshop
          </span>
        </span>
      )}
    </span>
  );
}
