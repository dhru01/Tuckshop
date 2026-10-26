import type { Metadata } from 'next';
import Link from 'next/link';

import { ActivityList } from '@/components/parent/activity-list';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { loadTransactionHistory } from '@/lib/parent/load-transactions';

export const metadata: Metadata = { title: 'Transactions' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const access = await requireActorForInterface('parent');
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const { items, hasMore } = await loadTransactionHistory(access.user.id, page);

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Purchases and top-ups for your children." />
      <ActivityList items={items} />
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/parent/transactions?page=${page - 1}`}>Previous</Link>
          </Button>
        ) : null}
        {hasMore ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/parent/transactions?page=${page + 1}`}>Next</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
