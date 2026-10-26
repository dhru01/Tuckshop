import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { withClient } from './db';

type Fixture = {
  school_id: string;
  admin_id: string;
  category_id: string;
};

async function pickSchoolAdmin(client: pg.Client): Promise<Fixture | null> {
  const { rows } = await client.query<Fixture>(
    `
    select
      s.id as school_id,
      ra.user_id as admin_id,
      (
        select c.id
        from public.product_categories c
        where c.school_id = s.id
        order by c.sort_order
        limit 1
      ) as category_id
    from public.schools s
    join public.role_assignments ra
      on ra.school_id = s.id
      and ra.role = 'school_admin'
      and ra.status = 'active'
    where s.status = 'active'
    limit 1
    `,
  );
  return rows[0] ?? null;
}

describe('inventory (database)', () => {
  it('stock movements reconcile to stock_quantity', async () => {
    await withClient(async (client) => {
      const fx = await pickSchoolAdmin(client);
      if (!fx?.category_id) {
        expect.fail('No school with categories — apply migration 0010.');
      }

      const barcode = `test-${randomUUID().slice(0, 8)}`;
      const created = await client.query<{ school_create_product: { product_id: string } }>(
        `select public.school_create_product($1, $2, $3, 'Test chips', null, $4, 500, 300, true, 10, 2) as school_create_product`,
        [fx.admin_id, fx.school_id, fx.category_id, barcode],
      );
      const productId = created.rows[0]?.school_create_product.product_id;
      expect(productId).toBeTruthy();

      await client.query(
        `select public.school_adjust_inventory($1, $2, 'restock', 5, 'delivery', 'restock', null, 'Wholesaler', 250)`,
        [fx.admin_id, productId],
      );

      const { rows: prod } = await client.query<{ stock_quantity: number }>(
        `select stock_quantity from public.products where id = $1`,
        [productId],
      );
      expect(prod[0]?.stock_quantity).toBe(15);

      const { rows: sumRows } = await client.query<{ total: string }>(
        `
        select coalesce(sum(quantity_delta), 0)::text as total
        from public.inventory_movements
        where product_id = $1
        `,
        [productId],
      );
      expect(Number(sumRows[0]?.total)).toBe(15);

      await expect(
        client.query(
          `select public.school_adjust_inventory($1, $2, 'write_off', 100, 'spoilage', 'write_off', null, null, null)`,
          [fx.admin_id, productId],
        ),
      ).rejects.toThrow();

      await client.query(`select public.school_archive_product($1, $2)`, [fx.admin_id, productId]);
    });
  });
});
