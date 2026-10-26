import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureCategoriesForSchool } from '@/app/actions/products';
import { CreateProductForm } from '@/components/school/create-product-form';
import { ImportProductsForm } from '@/components/school/import-products-form';
import { ProductList } from '@/components/school/product-list';
import { PageHeader } from '@/components/shared/page-header';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { publicEnv } from '@/lib/env/public';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { productImagePublicUrl } from '@/services/product-image-service';

export const metadata: Metadata = { title: 'Products' };

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const actor = actorId(access);
  const env = publicEnv();

  const categories = schoolId ? await ensureCategoriesForSchool(schoolId, actor) : [];

  const supabase = await createSupabaseServerClient();
  const { data: products } = schoolId
    ? await supabase
        .from('products')
        .select(
          'id, name, barcode, price_cents, cost_price_cents, track_stock, stock_quantity, low_stock_threshold, is_active, category_id, image_path',
        )
        .eq('school_id', schoolId)
        .is('archived_at', null)
        .order('name')
    : { data: [] };

  const rows = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    priceCents: p.price_cents,
    costPriceCents: p.cost_price_cents,
    trackStock: p.track_stock,
    stockQuantity: p.stock_quantity,
    lowStockThreshold: p.low_stock_threshold,
    isActive: p.is_active,
    categoryId: p.category_id,
    imageUrl: productImagePublicUrl(p.image_path, env.NEXT_PUBLIC_SUPABASE_URL),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        description="Manage catalogue, pricing, and barcodes for the tuck shop."
        actions={
          schoolId ? (
            <Link
              href="/school/products/export"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Export CSV
            </Link>
          ) : null
        }
      />
      {schoolId ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <CreateProductForm categories={categories} />
          <ImportProductsForm />
        </div>
      ) : null}
      <ProductList products={rows} categories={categories} />
    </div>
  );
}
