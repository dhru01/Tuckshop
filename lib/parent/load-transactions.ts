import 'server-only';

import type { ParentActivityItem } from '@/lib/parent/types';
import { loadGuardianChildren } from '@/lib/parent/load-children';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 20;

export async function loadTransactionHistory(
  parentId: string,
  page: number,
): Promise<{ items: ParentActivityItem[]; hasMore: boolean }> {
  const children = await loadGuardianChildren(parentId);
  if (children.length === 0) return { items: [], hasMore: false };

  const supabase = await createSupabaseServerClient();
  const learnerIds = children.map((c) => c.learnerId);
  const nameByLearner = new Map(children.map((c) => [c.learnerId, `${c.firstName} ${c.lastName}`]));
  const offset = Math.max(0, page - 1) * PAGE_SIZE;
  const fetchLimit = offset + PAGE_SIZE + 1;

  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, learner_id, total_cents, created_at, status')
    .in('learner_id', learnerIds)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  const { data: topUps } = await supabase
    .from('wallet_top_ups')
    .select('id, learner_id, amount_cents, created_at, status')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  const merged: ParentActivityItem[] = [];
  for (const p of purchases ?? []) {
    merged.push({
      kind: 'purchase',
      id: p.id,
      learnerId: p.learner_id,
      learnerName: nameByLearner.get(p.learner_id) ?? 'Learner',
      amountCents: p.total_cents,
      createdAt: p.created_at,
      label: 'Tuck shop purchase',
    });
  }
  for (const t of topUps ?? []) {
    merged.push({
      kind: 'top_up',
      id: t.id,
      learnerId: t.learner_id,
      learnerName: nameByLearner.get(t.learner_id) ?? 'Learner',
      amountCents: t.amount_cents,
      createdAt: t.created_at,
      status: t.status,
      label: 'Wallet top-up',
    });
  }

  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const slice = merged.slice(offset, offset + PAGE_SIZE);
  return { items: slice, hasMore: merged.length > offset + PAGE_SIZE };
}
