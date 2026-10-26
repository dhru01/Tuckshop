import { Construction } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';

/**
 * Honest placeholder for a route whose functionality has not been built yet.
 * It makes NO claim of working functionality and shows no sample data.
 */
export function PhasePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} {...(description ? { description } : {})} />
      <div className="bg-dot-grid flex flex-col items-center gap-4 rounded-2xl border border-dashed border-input bg-card px-6 py-16 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-soft">
          <Construction className="size-7" aria-hidden="true" />
        </span>
        <StatusBadge tone="neutral">Not implemented yet</StatusBadge>
        <p className="max-w-md text-sm text-pretty text-muted-foreground">
          This screen is scheduled for <strong className="text-foreground">Phase {phase}</strong> of
          the implementation plan (
          <code className="font-mono text-xs">docs/IMPLEMENTATION_PLAN.md</code>). No data is shown
          here and no actions are available yet.
        </p>
      </div>
    </div>
  );
}
