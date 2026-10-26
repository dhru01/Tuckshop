import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { withClient } from './db';

type WalletFixture = {
  wallet_id: string;
  school_id: string;
  admin_id: string;
  balance_cents: number;
};

async function pickWallet(client: pg.Client): Promise<WalletFixture | null> {
  const { rows } = await client.query<WalletFixture>(
    `
    select w.id as wallet_id, w.school_id, w.balance_cents, ra.user_id as admin_id
    from public.wallets w
    join public.schools s on s.id = w.school_id and s.status = 'active'
    join public.role_assignments ra
      on ra.school_id = w.school_id
      and ra.role = 'school_admin'
      and ra.status = 'active'
    limit 1
    `,
  );
  return rows[0] ?? null;
}

describe('ledger (database)', () => {
  it('pilot_fund_wallet credits balance and is idempotent', async () => {
    await withClient(async (client) => {
      const fixture = await pickWallet(client);
      if (!fixture) {
        expect.fail('No active school wallet in dev DB — onboard a school and add a learner first.');
      }

      const key = `test:pilot:${randomUUID()}`;
      const amount = 2500;

      const first = await client.query<{ pilot_fund_wallet: { balance_cents: number } }>(
        `select public.pilot_fund_wallet($1, $2, $3, 'integration test', $4) as pilot_fund_wallet`,
        [fixture.admin_id, fixture.wallet_id, amount, key],
      );
      const bal1 = first.rows[0]?.pilot_fund_wallet.balance_cents;
      expect(bal1).toBe(fixture.balance_cents + amount);

      const second = await client.query<{ pilot_fund_wallet: { balance_cents: number } }>(
        `select public.pilot_fund_wallet($1, $2, $3, 'integration test', $4) as pilot_fund_wallet`,
        [fixture.admin_id, fixture.wallet_id, amount, key],
      );
      expect(second.rows[0]?.pilot_fund_wallet.balance_cents).toBe(bal1);

      const recon = await client.query<{ run_reconciliation: { ok: boolean } }>(
        `select public.run_reconciliation($1, $2) as run_reconciliation`,
        [fixture.admin_id, fixture.school_id],
      );
      expect(recon.rows[0]?.run_reconciliation.ok).toBe(true);
    });
  });

  it('debit_wallet_ledger rejects insufficient funds', async () => {
    await withClient(async (client) => {
      const fixture = await pickWallet(client);
      if (!fixture) return;

      const { rows: balRows } = await client.query<{ balance_cents: number }>(
        `select balance_cents from public.wallets where id = $1`,
        [fixture.wallet_id],
      );
      const balance = balRows[0]?.balance_cents ?? 0;

      await expect(
        client.query(`select public.debit_wallet_ledger($1, $2, $3, $4, 'test', 'test', gen_random_uuid())`, [
          fixture.admin_id,
          fixture.wallet_id,
          balance + 1,
          `test:debit:${randomUUID()}`,
        ]),
      ).rejects.toThrow();
    });
  });
});
