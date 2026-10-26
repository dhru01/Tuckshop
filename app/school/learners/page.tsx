import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CreateLearnerForm } from '@/components/phase3/create-learner-form';
import { ImportRosterForm } from '@/components/phase3/import-roster-form';
import { LearnersPagination } from '@/components/school/learners-list-controls';
import { LearnersSearchField } from '@/components/school/learners-search-field';
import { LearnerListRow } from '@/components/school/learner-list-row';
import { PageHeader } from '@/components/shared/page-header';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import {
  LEARNERS_PAGE_SIZE,
  learnerSearchOrFilter,
  parseLearnersPage,
  sanitiseLearnerSearchQuery,
} from '@/lib/school/learner-search';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatRand } from '@/lib/wallets/money';

export const metadata: Metadata = { title: 'Learners' };

const LEARNER_SELECT =
  'id, first_name, last_name, grade, class_name, status, wallets ( id, balance_cents )';

type LearnerRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  class_name: string | null;
  status: string;
  wallets: { id: string; balance_cents: number } | { id: string; balance_cents: number }[] | null;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const { q: qRaw, page: pageRaw } = await searchParams;
  const query = sanitiseLearnerSearchQuery(qRaw ?? '');
  const requestedPage = parseLearnersPage(pageRaw);

  const supabase = await createSupabaseServerClient();

  let learners: LearnerRow[] = [];
  let totalCount = 0;
  let page = requestedPage;
  let totalPages = 1;

  if (schoolId) {
    const result = await fetchLearners(supabase, schoolId, query, requestedPage);
    learners = result.learners;
    totalCount = result.totalCount;
    totalPages = result.totalPages;
    page = result.page;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learners"
        description="Add learners manually or import a roster file with names and grades."
      />
      {schoolId ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <CreateLearnerForm />
          <ImportRosterForm />
        </div>
      ) : null}

      <div className="space-y-4">
        <Suspense
          fallback={
            <div className="max-w-md h-10 rounded-md border border-border bg-muted/30" aria-hidden="true" />
          }
        >
          <LearnersSearchField query={query} />
        </Suspense>
        <div className="overflow-hidden rounded-md border border-border bg-background">
          <ul className="divide-y divide-border">
            {learners.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                {query ? 'No learners match your search.' : 'No learners yet.'}
              </li>
            ) : (
              learners.map((l) => {
                const wallet = Array.isArray(l.wallets) ? l.wallets[0] : l.wallets;
                return (
                  <LearnerListRow
                    key={l.id}
                    learnerId={l.id}
                    firstName={l.first_name}
                    lastName={l.last_name}
                    grade={l.grade}
                    balanceLabel={formatRand(wallet?.balance_cents ?? 0)}
                    walletId={wallet?.id ?? null}
                  />
                );
              })
            )}
          </ul>
          <LearnersPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            query={query}
          />
        </div>
      </div>
    </div>
  );
}

function applyLearnerSearch<T extends { or: (filter: string) => T }>(
  builder: T,
  query: string,
): T {
  const filter = learnerSearchOrFilter(query);
  if (!filter) return builder;
  return builder.or(filter);
}

async function fetchLearners(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  schoolId: string,
  query: string,
  requestedPage: number,
) {
  let countQuery = supabase
    .from('learners')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);
  countQuery = applyLearnerSearch(countQuery, query);

  const { count } = await countQuery;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LEARNERS_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const from = (page - 1) * LEARNERS_PAGE_SIZE;
  const to = from + LEARNERS_PAGE_SIZE - 1;

  let dataQuery = supabase.from('learners').select(LEARNER_SELECT).eq('school_id', schoolId);
  dataQuery = applyLearnerSearch(dataQuery, query);

  const { data: learners } = await dataQuery
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .range(from, to);

  return {
    learners: (learners ?? []) as LearnerRow[],
    totalCount,
    totalPages,
    page,
  };
}
