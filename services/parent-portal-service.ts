import 'server-only';

import { callRpc } from '@/services/rpc';

export async function setSpendingLimits(
  actorId: string,
  learnerId: string,
  dailyLimitCents: number | null,
  weeklyLimitCents: number | null,
) {
  return callRpc<void>('parent_set_spending_limits', {
    p_actor_id: actorId,
    p_learner_id: learnerId,
    p_daily_limit_cents: dailyLimitCents,
    p_weekly_limit_cents: weeklyLimitCents,
  });
}

export async function setCardFrozen(actorId: string, cardId: string, frozen: boolean) {
  return callRpc<void>('parent_set_card_frozen', {
    p_actor_id: actorId,
    p_card_id: cardId,
    p_frozen: frozen,
  });
}
