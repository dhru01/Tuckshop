import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CardFreezeForm } from '@/components/parent/card-freeze-form';
import { SpendingLimitsForm } from '@/components/parent/spending-limits-form';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { loadGuardianChildren } from '@/lib/parent/load-children';
import { formatRand } from '@/lib/wallets/money';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ learnerId: string }>;
}): Promise<Metadata> {
  const { learnerId } = await params;
  return { title: `Child ${learnerId.slice(0, 8)}…` };
}

export default async function Page({ params }: { params: Promise<{ learnerId: string }> }) {
  const { learnerId } = await params;
  const access = await requireActorForInterface('parent');
  const children = await loadGuardianChildren(access.user.id);
  const child = children.find((c) => c.learnerId === learnerId);
  if (!child) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${child.firstName} ${child.lastName}`}
        description={`${child.grade} · ${child.schoolName}`}
      />
      <dl className="grid gap-4 rounded-md border border-border bg-background p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Wallet balance</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatRand(child.balanceCents)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Wallet status</dt>
          <dd><StatusBadge tone="neutral">{child.walletStatus ?? '—'}</StatusBadge></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">NFC card</dt>
          <dd>
            {child.cardStatus ? (
              <StatusBadge tone={child.cardStatus === 'frozen' ? 'warning' : 'success'}>
                {child.cardStatus}
              </StatusBadge>
            ) : (
              'No card registered'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Spending limits</dt>
          <dd className="text-muted-foreground">
            Daily: {child.dailyLimitCents !== null ? formatRand(child.dailyLimitCents) : 'None'}
            {' · '}
            Weekly: {child.weeklyLimitCents !== null ? formatRand(child.weeklyLimitCents) : 'None'}
          </dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Card</h2>
        <CardFreezeForm child={child} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Spending limits</h2>
        <SpendingLimitsForm child={child} />
      </section>

      <Button asChild variant="outline" size="sm">
        <Link href="/parent/children">Back to children</Link>
      </Button>
    </div>
  );
}
