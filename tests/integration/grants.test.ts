import { describe, expect, it } from 'vitest';

import { withClient } from './db';

describe('privilege grants (database)', () => {
  it('revokes school payment credentials from authenticated', async () => {
    await withClient(async (client) => {
      const { rows } = await client.query<{ privilege_type: string }>(
        `
        select privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = 'school_payment_credentials'
          and grantee = 'authenticated'
        `,
      );
      expect(rows).toHaveLength(0);
    });
  });

  it('revokes inventory mutation from authenticated', async () => {
    await withClient(async (client) => {
      const { rows } = await client.query<{ privilege_type: string }>(
        `
        select privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = 'inventory_movements'
          and grantee = 'authenticated'
          and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
        `,
      );
      expect(rows).toHaveLength(0);
    });
  });

  it('revokes ledger mutation from authenticated', async () => {
    await withClient(async (client) => {
      for (const table of ['ledger_transactions', 'ledger_entries']) {
        const { rows } = await client.query<{ privilege_type: string }>(
          `
          select privilege_type
          from information_schema.role_table_grants
          where table_schema = 'public'
            and table_name = $1
            and grantee = 'authenticated'
            and privilege_type in ('UPDATE', 'DELETE')
          `,
          [table],
        );
        expect(rows).toHaveLength(0);
      }
    });
  });
});
