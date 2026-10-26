import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { runReconciliation } from '@/services/ledger-service';

export const metadata: Metadata = { title: 'Transactions' };

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;

  let reconciliation: Awaited<ReturnType<typeof runReconciliation>>['data'] = null;
  if (schoolId) {
    const result = await runReconciliation(actorId(access), schoolId);
    reconciliation = result.data;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger & reconciliation"
        description="POS sales appear here in Phase 7. Pilot credits post through the audited ledger."
      />
      {reconciliation ? (
        <div className="rounded-md border border-border bg-background p-4 text-sm space-y-2">
          <p className="font-medium">Latest reconciliation check</p>
          <StatusBadge tone={reconciliation.ok ? 'success' : 'warning'}>
            {reconciliation.ok ? 'Balanced' : 'Needs attention'}
          </StatusBadge>
          <ul className="text-muted-foreground">
            <li>Wallet projection mismatches: {reconciliation.wallet_projection_mismatches}</li>
            <li>Ledger debits = credits: {reconciliation.ledger_balanced ? 'yes' : 'no'}</li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Could not run reconciliation.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Use <strong>Learners → Add funds</strong> to credit a pilot wallet (adjustment entry, not a real card payment).
      </p>
    </div>
  );
}
