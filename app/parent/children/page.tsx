import type { Metadata } from 'next';

import { ChildSummaryCard } from '@/components/parent/child-card';
import { ParentChildrenEmpty } from '@/components/phase3/parent-children-empty';
import { PageHeader } from '@/components/shared/page-header';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { loadGuardianChildren } from '@/lib/parent/load-children';

export const metadata: Metadata = { title: 'Children' };

export default async function Page() {
  const access = await requireActorForInterface('parent');
  const children = await loadGuardianChildren(access.user.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Children" description="Learners linked to your account." />
      {children.length === 0 ? (
        <ul className="divide-y rounded-md border border-border bg-background">
          <ParentChildrenEmpty
            contexts={access.contexts}
            accountEmail={access.profile.email}
          />
        </ul>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <ChildSummaryCard key={child.learnerId} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
