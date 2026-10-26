import type { Metadata } from 'next';

import { CreateLearnerForm } from '@/components/phase3/create-learner-form';
import { ImportRosterForm } from '@/components/phase3/import-roster-form';
import { PilotFundForm } from '@/components/school/pilot-fund-form';
import { PageHeader } from '@/components/shared/page-header';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatRand } from '@/lib/wallets/money';

export const metadata: Metadata = { title: 'Learners' };

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const supabase = await createSupabaseServerClient();

  const { data: learners } = schoolId
    ? await supabase
        .from('learners')
        .select(
          'id, first_name, last_name, grade, class_name, admission_ref, status, wallets ( id, balance_cents )',
        )
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learners"
        description="Add learners manually or import a CSV roster with parent/caregiver emails."
      />
      {schoolId ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <CreateLearnerForm />
          <ImportRosterForm />
        </div>
      ) : null}
      <ul className="divide-y rounded-md border border-border bg-background">
        {(learners ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">No learners yet.</li>
        ) : (
          (learners ?? []).map((l) => {
            const wallet = Array.isArray(l.wallets) ? l.wallets[0] : l.wallets;
            return (
              <li key={l.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{l.first_name} {l.last_name}</span>
                  <span className="tabular-nums font-medium">
                    {formatRand(wallet?.balance_cents ?? 0)}
                  </span>
                </div>
                <span className="text-muted-foreground"> · {l.grade}</span>
                <span className="block text-xs text-muted-foreground">{l.admission_ref}</span>
                {wallet?.id ? (
                  <PilotFundForm
                    walletId={wallet.id}
                    learnerName={`${l.first_name} ${l.last_name}`}
                  />
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
