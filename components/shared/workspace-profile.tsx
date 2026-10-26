import Link from 'next/link';
import { ChevronsUpDown } from 'lucide-react';

import type { ShellWorkspace } from '@/lib/auth/shell-workspace';
import { cn } from '@/lib/utils';

/**
 * School (or platform) identity at the bottom of the sidebar — separate from the Tuckshop product brand.
 */
export function WorkspaceProfile({
  workspace,
  className,
}: {
  workspace?: ShellWorkspace;
  className?: string;
}) {
  const ws = workspace ?? { name: 'Tuckshop', hint: '', initial: 'T' };
  const body = (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left',
        ws.switchHref && 'hover:bg-muted/70',
        className,
      )}
    >
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
        aria-hidden="true"
      >
        {ws.initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{ws.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{ws.hint}</span>
      </span>
      {ws.switchHref ? (
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </div>
  );

  if (ws.switchHref) {
    return (
      <Link href={ws.switchHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        <span className="sr-only">Switch workspace</span>
        {body}
      </Link>
    );
  }

  if (ws.manageHref) {
    return (
      <Link href={ws.manageHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        {body}
      </Link>
    );
  }

  return body;
}
