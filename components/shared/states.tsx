import { AlertCircle, Inbox, type LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Empty state: nothing to show yet, with an optional next action. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-dot-grid flex flex-col items-center gap-4 rounded-2xl border border-dashed border-input bg-card px-6 py-14 text-center',
        className,
      )}
    >
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-soft">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-base font-semibold">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Error state: something failed. Never pass raw error text from the database here. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If the problem continues, contact support.',
  action,
  reference,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** Opaque error digest/request id that support can look up. */
  reference?: string | undefined;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl border border-danger/25 bg-danger-soft px-6 py-12 text-center',
        className,
      )}
    >
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-card text-danger shadow-soft">
        <AlertCircle className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-base font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>
        {reference && <p className="text-xs text-muted-foreground">Reference: {reference}</p>}
      </div>
      {action}
    </div>
  );
}

/** Generic loading skeleton for page bodies. */
export function LoadingState({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-5', className)} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-56 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}
