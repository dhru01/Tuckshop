import { ensureCategoriesForSchool } from '@/app/actions/products';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { exportProductsCsv } from '@/lib/products/csv';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) {
    return new Response('No school context', { status: 403 });
  }

  const actor = actorId(access);
  await ensureCategoriesForSchool(schoolId, actor);

  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from('products')
    .select(
      'name, barcode, price_cents, cost_price_cents, track_stock, stock_quantity, low_stock_threshold, product_categories ( name )',
    )
    .eq('school_id', schoolId)
    .is('archived_at', null)
    .order('name');

  const rows = (products ?? []).map((p) => {
    const cat = Array.isArray(p.product_categories)
      ? p.product_categories[0]
      : p.product_categories;
    return {
      name: p.name,
      barcode: p.barcode,
      categoryName: cat?.name ?? 'Other',
      priceCents: p.price_cents,
      costPriceCents: p.cost_price_cents,
      trackStock: p.track_stock,
      stockQuantity: p.stock_quantity,
      lowStockThreshold: p.low_stock_threshold,
    };
  });

  const csv = exportProductsCsv(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="products.csv"',
    },
  });
}
