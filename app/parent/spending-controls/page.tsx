import type { Metadata } from 'next';

import { SpendingLimitsForm } from '@/components/parent/spending-limits-form';
import { CardFreezeForm } from '@/components/parent/card-freeze-form';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { loadGuardianChildren } from '@/lib/parent/load-children';

export const metadata: Metadata = { title: 'Spending controls' };

export default async function Page() {
  const access = await requireActorForInterface('parent');
  const children = await loadGuardianChildren(access.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Spending controls"
        description="Set daily and weekly limits and freeze cards. Enforced at checkout when POS is live."
      />
      {children.length === 0 ? (
        <EmptyState title="No children" description="Link a child to manage controls." />
      ) : (
        <div className="space-y-6">
          {children.map((child) => (
            <div key={child.learnerId} className="space-y-4 rounded-md border border-border p-4">
              <SpendingLimitsForm child={child} />
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-medium">NFC card</p>
                <CardFreezeForm child={child} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
