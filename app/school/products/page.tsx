import type { Metadata } from 'next';

import { ensureCategoriesForSchool } from '@/app/actions/products';
import { CreateProductForm } from '@/components/school/create-product-form';
import { ImportProductsForm } from '@/components/school/import-products-form';
import { ProductList } from '@/components/school/product-list';
import { PageHeader } from '@/components/shared/page-header';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { CATALOG_PRODUCT_SELECT, isVisibleOnPos } from '@/lib/school/catalog';
import { publicEnv } from '@/lib/env/public';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { productImagePublicUrl } from '@/services/product-image-service';

export const metadata: Metadata = { title: 'Products' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const actor = actorId(access);
  const env = publicEnv();

  const categoriesRaw = schoolId ? await ensureCategoriesForSchool(schoolId, actor) : [];
  const categories = [...categoriesRaw].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  const supabase = await createSupabaseServerClient();
  const { data: products } = schoolId
    ? await supabase
        .from('products')
        .select(CATALOG_PRODUCT_SELECT)
        .eq('school_id', schoolId)
        .is('archived_at', null)
        .order('name')
    : { data: [] };

  const rows = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    priceCents: p.price_cents,
    isActive: p.is_active,
    categoryId: p.category_id,
    imageUrl: productImagePublicUrl(p.image_path, env.NEXT_PUBLIC_SUPABASE_URL),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        description="Manage the tuck shop catalogue — changes sync to the school POS when products are shown on POS."
      />
      {schoolId ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <CreateProductForm categories={categories} />
          <ImportProductsForm />
        </div>
      ) : null}
      <ProductList
        products={rows}
        categories={categories}
        posProductCount={(products ?? []).filter((p) => isVisibleOnPos(p)).length}
      />
    </div>
  );
}
