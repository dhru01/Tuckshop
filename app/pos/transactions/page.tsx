import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatRand } from '@/lib/wallets/money';

export const metadata: Metadata = { title: 'Transactions' };

export default async function Page() {
  const access = await requireActorForInterface('pos');
  const schoolId = access.active.schoolId;
  const actor = actorId(access);
  const supabase = await createSupabaseServerClient();

  const { data: purchases } = schoolId
    ? await supabase
        .from('purchases')
        .select('id, receipt_number, total_cents, wallet_balance_after_cents, created_at')
        .eq('school_id', schoolId)
        .eq('cashier_id', actor)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="Your recent sales on this account." />
      {(purchases ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No sales yet.</p>
      ) : (
        <ul className="divide-y rounded-md border border-border bg-background text-sm">
          {(purchases ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span>
                Receipt #{p.receipt_number}
                <span className="text-muted-foreground">
                  {' '}
                  · {new Date(p.created_at).toLocaleString()}
                </span>
              </span>
              <span className="font-medium tabular-nums">{formatRand(p.total_cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
