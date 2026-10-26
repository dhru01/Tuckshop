import type { Metadata } from 'next';
import Link from 'next/link';

import { ActivityList } from '@/components/parent/activity-list';
import { ChildSummaryCard } from '@/components/parent/child-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/states';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { loadGuardianChildren, loadRecentActivity } from '@/lib/parent/load-children';
import { formatRand } from '@/lib/wallets/money';
import { Wallet, GraduationCap } from 'lucide-react';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function Page() {
  const access = await requireActorForInterface('parent');
  const children = await loadGuardianChildren(access.user.id);
  const activity = await loadRecentActivity(access.user.id, children);
  const totalCents = children.reduce((sum, c) => sum + c.balanceCents, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi, ${access.profile.first_name}`}
        description="Balances and recent activity for your linked children."
      />

      {children.length === 0 ? (
        <EmptyState
          title="No children linked"
          description="Accept a school invite to see wallets and activity here."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/parent/children">Go to children</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Combined balance"
              value={formatRand(totalCents)}
              hint={`${children.length} linked learner(s)`}
              icon={Wallet}
            />
            <StatCard
              label="Children"
              value={children.length}
              hint="Tap a card for details"
              icon={GraduationCap}
            />
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Your children</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {children.map((child) => (
                <ChildSummaryCard key={child.learnerId} child={child} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Recent activity</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/parent/transactions">View all</Link>
              </Button>
            </div>
            <ActivityList items={activity} />
          </section>
        </>
      )}
    </div>
  );
}
