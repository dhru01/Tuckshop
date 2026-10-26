import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { loadGuardianChildren } from '@/lib/parent/load-children';
import { formatRand } from '@/lib/wallets/money';

export const metadata: Metadata = { title: 'Wallet' };

export default async function Page() {
  const access = await requireActorForInterface('parent');
  const children = await loadGuardianChildren(access.user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Wallets" description="One wallet per child at their school." />
      {children.length === 0 ? (
        <EmptyState title="No wallets" description="Link a child to see their wallet balance." />
      ) : (
        <ul className="divide-y rounded-md border border-border bg-background">
          {children.map((child) => (
            <li key={child.learnerId} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{child.firstName} {child.lastName}</p>
                <p className="text-sm text-muted-foreground">{child.schoolName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">{formatRand(child.balanceCents)}</p>
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href={`/parent/children/${child.learnerId}`}>Details</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Balances come from the ledger. Your school can add pilot funds on Learners; card top-ups arrive in Phase 9.
      </p>
    </div>
  );
}
