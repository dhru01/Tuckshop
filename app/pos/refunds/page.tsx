import type { Metadata } from 'next';

import { PosRefundsView } from '@/components/pos/pos-refunds-view';
import { PageHeader } from '@/components/shared/page-header';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Refunds' };

export default async function Page() {
  const access = await requireActorForInterface('pos');
  const schoolId = access.active.schoolId;
  const canApprove = access.active.role === 'school_admin';
  const supabase = await createSupabaseServerClient();

  const { data: purchases } = schoolId
    ? await supabase
        .from('purchases')
        .select(
          `
          id,
          receipt_number,
          total_cents,
          created_at,
          status,
          purchase_items (
            id,
            product_name,
            unit_price_cents,
            quantity,
            refunded_quantity,
            product_id,
            products ( track_stock )
          )
        `,
        )
        .eq('school_id', schoolId)
        .in('status', ['completed', 'partially_refunded'])
        .order('created_at', { ascending: false })
        .limit(30)
    : { data: [] };

  const { data: pending } =
    schoolId && canApprove
      ? await supabase
          .from('refunds')
          .select(
            `
            id,
            amount_cents,
            reason,
            created_at,
            purchases ( receipt_number )
          `,
          )
          .eq('school_id', schoolId)
          .eq('status', 'requested')
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] };

  const mappedPurchases = (purchases ?? []).map((p) => ({
    id: p.id,
    receiptNumber: p.receipt_number,
    totalCents: p.total_cents,
    createdAt: p.created_at,
    status: p.status,
    items: (p.purchase_items ?? []).map((item) => {
      const raw = item.products;
      const prod = Array.isArray(raw) ? raw[0] : raw;
      const trackStock =
        prod && typeof prod === 'object' && 'track_stock' in prod
          ? Boolean((prod as { track_stock: boolean }).track_stock)
          : false;
      return {
        id: item.id,
        name: item.product_name,
        unitPriceCents: item.unit_price_cents,
        quantity: item.quantity,
        refundedQuantity: item.refunded_quantity ?? 0,
        productId: item.product_id,
        trackStock,
      };
    }),
  }));

  const pendingRefunds = (pending ?? []).map((r) => {
    const raw = r.purchases;
    const purchase = Array.isArray(raw) ? raw[0] : raw;
    return {
      id: r.id,
      amountCents: r.amount_cents,
      reason: r.reason,
      createdAt: r.created_at,
      receiptNumber:
        purchase && typeof purchase === 'object' && 'receipt_number' in purchase
          ? Number((purchase as { receipt_number: number }).receipt_number)
          : 0,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refunds"
        description="Credit the learner wallet for a prior sale. Large refunds need admin approval."
      />
      <PosRefundsView
        purchases={mappedPurchases}
        pendingRefunds={pendingRefunds}
        canApprove={canApprove}
      />
    </div>
  );
}
