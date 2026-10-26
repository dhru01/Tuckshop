import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { LEARNERS_PAGE_SIZE, learnersListHref } from '@/lib/school/learner-search';

export function LearnersPagination({
  page,
  totalPages,
  totalCount,
  query,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  query: string;
}) {
  if (totalCount === 0) return null;

  const from = (page - 1) * LEARNERS_PAGE_SIZE + 1;
  const to = Math.min(page * LEARNERS_PAGE_SIZE, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Showing {from}–{to} of {totalCount}
        {query ? ` matching “${query}”` : ''}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={learnersListHref(page - 1, query)}>Previous</Link>
          </Button>
        ) : null}
        <span className="px-2 text-muted-foreground tabular-nums">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={learnersListHref(page + 1, query)}>Next</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
