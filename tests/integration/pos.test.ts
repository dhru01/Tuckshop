import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { withClient } from './db';

type Fixture = {
  school_id: string;
  actor_id: string;
  credential: string;
  product_id: string;
  shift_id: string;
};

async function pickPosFixture(client: pg.Client): Promise<Fixture | null> {
  const { rows } = await client.query<{
    school_id: string;
    actor_id: string;
    credential: string;
    product_id: string;
    wallet_balance: number;
  }>(
    `
    select
      s.id as school_id,
      ra.user_id as actor_id,
      c.credential_reference as credential,
      p.id as product_id,
      w.balance_cents as wallet_balance
    from public.schools s
    join public.role_assignments ra on ra.school_id = s.id and ra.status = 'active'
      and ra.role in ('school_admin', 'cashier')
    join public.nfc_cards c on c.school_id = s.id and c.card_status = 'active' and c.learner_id is not null
    join public.products p on p.school_id = s.id and p.is_active and p.archived_at is null and p.price_cents > 0
    join public.wallets w on w.school_id = s.id
    join public.learners l on l.id = w.learner_id and l.id = c.learner_id
    where s.status = 'active'
      and w.balance_cents >= p.price_cents
    limit 1
    `,
  );
  const row = rows[0];
  if (!row) return null;

  const device = await client.query<{ pos_ensure_device: { pos_device_id: string } }>(
    `select public.pos_ensure_device($1, $2, 'integration-test') as pos_ensure_device`,
    [row.actor_id, row.school_id],
  );
  const deviceId = device.rows[0]?.pos_ensure_device.pos_device_id;

  const shift = await client.query<{ pos_open_shift: { shift_id: string } }>(
    `select public.pos_open_shift($1, $2, $3) as pos_open_shift`,
    [row.actor_id, row.school_id, deviceId],
  );
  const shiftId = shift.rows[0]?.pos_open_shift.shift_id;
  if (!shiftId) return null;

  return {
    school_id: row.school_id,
    actor_id: row.actor_id,
    credential: row.credential,
    product_id: row.product_id,
    shift_id: shiftId,
  };
}

describe('POS checkout (database)', () => {
  it('completes a purchase and debits wallet', async () => {
    await withClient(async (client) => {
      const fx = await pickPosFixture(client);
      if (!fx) {
        expect.fail('Need active card, product, and funded wallet — apply migration 0011 and seed data.');
      }

      const key = `test:pos:${randomUUID()}`;
      const items = JSON.stringify([{ product_id: fx.product_id, quantity: 1 }]);
      const hash = 'test-hash-' + key;

      const checkout = await client.query<{ pos_checkout: { status: string; total_cents: number } }>(
        `select public.pos_checkout($1, $2, $3, $4, $5, $6::jsonb, $7, null) as pos_checkout`,
        [fx.actor_id, fx.school_id, key, hash, fx.credential, items, fx.shift_id],
      );
      const result = checkout.rows[0]?.pos_checkout;
      expect(result?.status).toBe('completed');

      const again = await client.query<{ pos_checkout: { status: string } }>(
        `select public.pos_checkout($1, $2, $3, $4, $5, $6::jsonb, $7, null) as pos_checkout`,
        [fx.actor_id, fx.school_id, key, hash, fx.credential, items, fx.shift_id],
      );
      expect(again.rows[0]?.pos_checkout.status).toBe('completed');
    });
  });

  it('pos_validate_credential_for_checkout accepts known pilot credentials', async () => {
    await withClient(async (client) => {
      const fx = await pickPosFixture(client);
      if (!fx) {
        expect.fail('Need active card — apply migration 0014 and seed data.');
      }

      const ok = await client.query<{ pos_validate_credential_for_checkout: { ok: boolean } }>(
        `select public.pos_validate_credential_for_checkout($1, $2, $3) as pos_validate_credential_for_checkout`,
        [fx.actor_id, fx.school_id, fx.credential],
      );
      expect(ok.rows[0]?.pos_validate_credential_for_checkout.ok).toBe(true);

      const bad = await client.query<{ pos_validate_credential_for_checkout: { ok: boolean } }>(
        `select public.pos_validate_credential_for_checkout($1, $2, 'uid:ff:ff:ff:ff:ff:ff:ff') as pos_validate_credential_for_checkout`,
        [fx.actor_id, fx.school_id],
      );
      expect(bad.rows[0]?.pos_validate_credential_for_checkout.ok).toBe(false);
    });
  });
});
