import type { Metadata } from 'next';

import { ensureCategoriesForSchool } from '@/app/actions/products';
import { AdjustStockForm } from '@/components/school/adjust-stock-form';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatRand } from '@/lib/wallets/money';

export const metadata: Metadata = { title: 'Inventory' };

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const actor = actorId(access);

  if (schoolId) {
    await ensureCategoriesForSchool(schoolId, actor);
  }

  const supabase = await createSupabaseServerClient();

  const { data: products } = schoolId
    ? await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold, track_stock, price_cents')
        .eq('school_id', schoolId)
        .is('archived_at', null)
        .eq('track_stock', true)
        .order('name')
    : { data: [] };

  const { data: movements } = schoolId
    ? await supabase
        .from('inventory_movements')
        .select(
          'id, product_id, movement_type, quantity_delta, quantity_after, reason, created_at, products ( name )',
        )
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(40)
    : { data: [] };

  const tracked = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stockQuantity: p.stock_quantity,
  }));

  const lowStock = (products ?? []).filter(
    (p) =>
      p.low_stock_threshold !== null &&
      p.low_stock_threshold !== undefined &&
      p.stock_quantity <= p.low_stock_threshold,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        description="Stock levels, restocks, and movement history."
      />

      {lowStock.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <h2 className="text-sm font-medium">Low stock</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {lowStock.map((p) => (
              <li key={p.id}>
                {p.name}: {p.stock_quantity} on hand
                {p.low_stock_threshold !== null && p.low_stock_threshold !== undefined
                  ? ` (alert ≤ ${p.low_stock_threshold})`
                  : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {schoolId ? <AdjustStockForm products={tracked} /> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recent movements</h2>
        {(movements ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No stock movements yet.</p>
        ) : (
          <ul className="divide-y rounded-md border border-border bg-background text-sm">
            {(movements ?? []).map((m) => {
              const prod = Array.isArray(m.products) ? m.products[0] : m.products;
              const label = String(m.movement_type).replace('_', ' ');
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div>
                    <span className="font-medium">{prod?.name ?? 'Product'}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {label} {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                      {' '}
                      → {m.quantity_after} on hand
                    </span>
                    {m.reason ? (
                      <p className="text-xs text-muted-foreground">{m.reason}</p>
                    ) : null}
                  </div>
                  <StatusBadge tone="neutral">{new Date(m.created_at).toLocaleString()}</StatusBadge>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Stock on hand</h2>
        {(products ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracked products.</p>
        ) : (
          <ul className="divide-y rounded-md border border-border bg-background text-sm">
            {(products ?? []).map((p) => (
              <li key={p.id} className="flex justify-between p-3">
                <span>{p.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {p.stock_quantity} · {formatRand(p.price_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
