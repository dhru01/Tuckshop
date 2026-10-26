import { Construction } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';

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
      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-start gap-3">
          <StatusBadge tone="neutral">Not implemented yet</StatusBadge>
          <div className="flex items-start gap-3">
            <Construction
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              This screen is scheduled for <strong>Phase {phase}</strong> of the implementation plan
              (<code className="font-mono text-xs">docs/IMPLEMENTATION_PLAN.md</code>). No data is
              shown here and no actions are available yet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
