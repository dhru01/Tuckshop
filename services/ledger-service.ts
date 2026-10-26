import 'server-only';

import { callRpc } from '@/services/rpc';

export async function pilotFundWallet(
  actorId: string,
  walletId: string,
  amountCents: number,
  reason: string,
  idempotencyKey: string,
) {
  return callRpc<{ ledger_transaction_id: string; wallet_id: string; balance_cents: number }>(
    'pilot_fund_wallet',
    {
      p_actor_id: actorId,
      p_wallet_id: walletId,
      p_amount_cents: amountCents,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
    },
  );
}

export async function runReconciliation(actorId: string, schoolId: string) {
  return callRpc<{
    school_id: string;
    wallet_projection_mismatches: number;
    ledger_balanced: boolean;
    ok: boolean;
  }>('run_reconciliation', {
    p_actor_id: actorId,
    p_school_id: schoolId,
  });
}
