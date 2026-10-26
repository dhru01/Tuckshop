import Link from 'next/link';
import { ChevronsUpDown } from 'lucide-react';

import type { ShellWorkspace } from '@/lib/auth/shell-workspace';
import { cn } from '@/lib/utils';

/**
 * School (or platform) identity at the bottom of the sidebar — separate from the FirstByte product brand.
 * `tone="dark"` is for the ink sidebar; `tone="light"` for use on a light surface (mobile sheet).
 */
export function WorkspaceProfile({
  workspace,
  className,
  tone = 'dark',
}: {
  workspace?: ShellWorkspace;
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const ws = workspace ?? { name: 'FirstByte Tuckshop', hint: '', initial: 'F' };
  const dark = tone === 'dark';
  const body = (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors',
        dark ? 'bg-sidebar-accent/70' : 'bg-muted/60',
        ws.switchHref && (dark ? 'hover:bg-sidebar-accent' : 'hover:bg-muted'),
        className,
      )}
    >
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-gradient font-heading text-sm font-bold text-white ring-1 ring-white/10"
        aria-hidden="true"
      >
        {ws.initial}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-semibold',
            dark ? 'text-sidebar-accent-foreground' : 'text-foreground',
          )}
        >
          {ws.name}
        </span>
        <span
          className={cn(
            'block truncate text-xs',
            dark ? 'text-sidebar-muted' : 'text-muted-foreground',
          )}
        >
          {ws.hint}
        </span>
      </span>
      {ws.switchHref ? (
        <ChevronsUpDown
          className={cn('size-4 shrink-0', dark ? 'text-sidebar-muted' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  if (ws.switchHref) {
    return (
      <Link
        href={ws.switchHref}
        className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="sr-only">Switch workspace</span>
        {body}
      </Link>
    );
  }

  if (ws.manageHref) {
    return (
      <Link
        href={ws.manageHref}
        className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {body}
      </Link>
    );
  }

  return body;
}
