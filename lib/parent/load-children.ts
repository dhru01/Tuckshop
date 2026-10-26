import 'server-only';

import type { GuardianChild, ParentActivityItem } from '@/lib/parent/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LearnerRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  school_id: string;
  schools: { name: string } | { name: string }[] | null;
  wallets:
    | { id: string; balance_cents: number; status: string }
    | { id: string; balance_cents: number; status: string }[]
    | null;
  nfc_cards:
    | { id: string; card_status: string }
    | { id: string; card_status: string }[]
    | null;
};

type LinkRow = {
  status: string;
  can_manage_controls: boolean;
  learners: LearnerRow | LearnerRow[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function loadGuardianChildren(parentId: string): Promise<GuardianChild[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('parent_learner_relationships')
    .select(
      `
      status,
      can_manage_controls,
      learners (
        id,
        first_name,
        last_name,
        grade,
        school_id,
        schools ( name ),
        wallets ( id, balance_cents, status ),
        nfc_cards ( id, card_status )
      )
    `,
    )
    .eq('parent_id', parentId)
    .eq('status', 'active');

  if (error || !data) return [];

  const learnerIds = (data as LinkRow[])
    .map((row) => one(row.learners)?.id)
    .filter((id): id is string => Boolean(id));

  const limitsByLearner = new Map<string, { daily: number | null; weekly: number | null }>();
  if (learnerIds.length > 0) {
    const { data: limits } = await supabase
      .from('spending_limits')
      .select('learner_id, daily_limit_cents, weekly_limit_cents')
      .in('learner_id', learnerIds);
    for (const row of limits ?? []) {
      limitsByLearner.set(row.learner_id, {
        daily: row.daily_limit_cents,
        weekly: row.weekly_limit_cents,
      });
    }
  }

  const children: GuardianChild[] = [];
  for (const row of data as LinkRow[]) {
    const learner = one(row.learners);
    if (!learner) continue;
    const school = one(learner.schools);
    const wallet = one(learner.wallets);
    const cards = Array.isArray(learner.nfc_cards)
      ? learner.nfc_cards
      : learner.nfc_cards
        ? [learner.nfc_cards]
        : [];
    const activeCard =
      cards.find((c) => c.card_status === 'active' || c.card_status === 'frozen') ?? cards[0];
    const limits = limitsByLearner.get(learner.id);

    children.push({
      learnerId: learner.id,
      firstName: learner.first_name,
      lastName: learner.last_name,
      grade: learner.grade,
      schoolId: learner.school_id,
      schoolName: school?.name ?? 'School',
      linkStatus: row.status,
      canManageControls: row.can_manage_controls,
      walletId: wallet?.id ?? null,
      balanceCents: wallet?.balance_cents ?? 0,
      walletStatus: wallet?.status ?? null,
      cardId: activeCard?.id ?? null,
      cardStatus: activeCard?.card_status ?? null,
      dailyLimitCents: limits?.daily ?? null,
      weeklyLimitCents: limits?.weekly ?? null,
    });
  }

  return children.sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export async function loadRecentActivity(
  parentId: string,
  children: GuardianChild[],
  limit = 10,
): Promise<ParentActivityItem[]> {
  if (children.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const nameByLearner = new Map(children.map((c) => [c.learnerId, `${c.firstName} ${c.lastName}`]));

  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, learner_id, total_cents, created_at, status')
    .in('learner_id', children.map((c) => c.learnerId))
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data: topUps } = await supabase
    .from('wallet_top_ups')
    .select('id, learner_id, amount_cents, created_at, status')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const items: ParentActivityItem[] = [];

  for (const p of purchases ?? []) {
    items.push({
      kind: 'purchase',
      id: p.id,
      learnerId: p.learner_id,
      learnerName: nameByLearner.get(p.learner_id) ?? 'Learner',
      amountCents: p.total_cents,
      createdAt: p.created_at,
      label: p.status === 'completed' ? 'Tuck shop purchase' : `Purchase (${p.status})`,
    });
  }

  for (const t of topUps ?? []) {
    items.push({
      kind: 'top_up',
      id: t.id,
      learnerId: t.learner_id,
      learnerName: nameByLearner.get(t.learner_id) ?? 'Learner',
      amountCents: t.amount_cents,
      createdAt: t.created_at,
      status: t.status,
      label: t.status === 'succeeded' ? 'Wallet top-up' : `Top-up (${t.status})`,
    });
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items.slice(0, limit);
}
