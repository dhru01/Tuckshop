import { describe, expect, it } from 'vitest';

import { withClient } from './db';

describe('ledger immutability (database)', () => {
  it('blocks updates and deletes on ledger_entries for the postgres role', async () => {
    await withClient(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `select id from public.ledger_entries limit 1`,
      );
      if (rows.length === 0) {
        // Schema present but no rows yet – still verify trigger exists.
        const trig = await client.query(
          `select 1 from pg_trigger where tgname = 'ledger_entries_no_update'`,
        );
        expect(trig.rowCount).toBe(1);
        return;
      }
      const id = rows[0]!.id;
      await expect(
        client.query(`update public.ledger_entries set amount_cents = 1 where id = $1`, [id]),
      ).rejects.toThrow(/append-only/i);
      await expect(client.query(`delete from public.ledger_entries where id = $1`, [id])).rejects.toThrow(
        /append-only/i,
      );
    });
  });
});
