import type { Metadata } from 'next';

import { PosSellView } from '@/components/pos/pos-sell-view';
import { CATALOG_CATEGORY_SELECT, POS_PRODUCT_SELECT } from '@/lib/school/catalog';
import { PageHeader } from '@/components/shared/page-header';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { serverEnv } from '@/lib/env/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Sell' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const access = await requireActorForInterface('pos');
  const schoolId = access.active.schoolId;
  const env = serverEnv();
  const allowSimulatedTap =
    env.APP_ENV === 'development' || env.APP_ENV === 'test' || env.SIMULATED_NFC_ENABLED;

  const supabase = await createSupabaseServerClient();

  const { data: categories } = schoolId
    ? await supabase
        .from('product_categories')
        .select(CATALOG_CATEGORY_SELECT)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('sort_order')
    : { data: [] };

  const { data: products } = schoolId
    ? await supabase
        .from('products')
        .select(POS_PRODUCT_SELECT)
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .is('archived_at', null)
        .order('name')
    : { data: [] };

  return (
    <div className="space-y-6">
      <PageHeader title="Sell" description="Scan or tap products, then checkout with a school card." />
      <PosSellView
        allowSimulatedTap={allowSimulatedTap}
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          colour: c.colour,
        }))}
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.price_cents,
          barcode: p.barcode,
          categoryId: p.category_id,
        }))}
      />
    </div>
  );
}
