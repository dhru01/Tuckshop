'use client';

import { useMemo, useState } from 'react';

import { approveRefundAction, requestRefundAction } from '@/app/actions/refunds';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRand } from '@/lib/wallets/money';

export type RefundablePurchase = {
  id: string;
  receiptNumber: number;
  totalCents: number;
  createdAt: string;
  status: string;
  items: {
    id: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    refundedQuantity: number;
    productId: string | null;
    trackStock: boolean;
  }[];
};

export type PendingRefund = {
  id: string;
  amountCents: number;
  reason: string;
  createdAt: string;
  receiptNumber: number;
};

export function PosRefundsView({
  purchases,
  pendingRefunds,
  canApprove,
}: {
  purchases: RefundablePurchase[];
  pendingRefunds: PendingRefund[];
  canApprove: boolean;
}) {
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const selected = useMemo(
    () => purchases.find((p) => p.id === purchaseId) ?? null,
    [purchaseId, purchases],
  );

  const refundableCents = useMemo(() => {
    if (!selected) return 0;
    let t = 0;
    for (const item of selected.items) {
      const remaining = item.quantity - item.refundedQuantity;
      const q = qty[item.id] ?? remaining;
      if (q > 0 && q <= remaining) {
        t += Math.round((item.unitPriceCents) * q);
      }
    }
    return t;
  }, [selected, qty]);

  async function submitRefund() {
    if (!selected) return;
    setPending(true);
    setError(undefined);
    setSuccess(undefined);

    const lines = selected.items
      .map((item) => {
        const remaining = item.quantity - item.refundedQuantity;
        const q = Math.min(remaining, qty[item.id] ?? remaining);
        if (q <= 0) return null;
        return { purchase_item_id: item.id, quantity: q };
      })
      .filter((l): l is { purchase_item_id: string; quantity: number } => l !== null);

    const result = await requestRefundAction({
      purchaseId: selected.id,
      lines,
      reason,
      restock,
      idempotencyKey: `refund:${crypto.randomUUID()}`,
    });

    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.pendingApproval) {
      setSuccess(
        `Refund of ${formatRand(result.amountCents)} submitted for school admin approval.`,
      );
    } else {
      setSuccess(`Refunded ${formatRand(result.amountCents)} to the learner wallet.`);
    }
    setPurchaseId(null);
    setReason('');
  }

  async function approve(id: string) {
    setPending(true);
    setError(undefined);
    const result = await approveRefundAction(id);
    setPending(false);
    if (result.error) setError(result.error);
    else setSuccess(result.success);
  }

  return (
    <div className="space-y-8">
      <FormError message={error} />
      {success ? (
        <p className="rounded-md border border-success/30 bg-success-soft p-3 text-sm text-success" role="status">
          {success}
        </p>
      ) : null}

      {canApprove && pendingRefunds.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Pending approval</h2>
          <ul className="divide-y rounded-md border border-border bg-background text-sm">
            {pendingRefunds.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  Receipt #{r.receiptNumber} · {formatRand(r.amountCents)}
                  <span className="block text-muted-foreground">{r.reason}</span>
                </span>
                <Button type="button" size="sm" disabled={pending} onClick={() => approve(r.id)}>
                  Approve
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Request refund</h2>
        <p className="text-sm text-muted-foreground">
          Refunds up to R50.00 complete immediately; larger amounts need school admin approval.
        </p>
        <ul className="divide-y rounded-md border border-border bg-background text-sm">
          {purchases.length === 0 ? (
            <li className="p-3 text-muted-foreground">No recent sales to refund.</li>
          ) : (
            purchases.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-muted/50"
                  onClick={() => {
                    setPurchaseId(p.id);
                    const initial: Record<string, number> = {};
                    for (const item of p.items) {
                      initial[item.id] = item.quantity - item.refundedQuantity;
                    }
                    setQty(initial);
                  }}
                >
                  <span>
                    Receipt #{p.receiptNumber} · {new Date(p.createdAt).toLocaleString()}
                  </span>
                  <span className="font-medium tabular-nums">{formatRand(p.totalCents)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {selected ? (
        <section className="space-y-4 rounded-lg border border-border bg-background p-4">
          <h3 className="font-medium">Receipt #{selected.receiptNumber}</h3>
          <ul className="space-y-2 text-sm">
            {selected.items.map((item) => {
              const remaining = item.quantity - item.refundedQuantity;
              if (remaining <= 0) return null;
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-[8rem]">{item.name}</span>
                  <Label className="sr-only" htmlFor={`qty-${item.id}`}>Quantity</Label>
                  <Input
                    id={`qty-${item.id}`}
                    type="number"
                    min={0}
                    max={remaining}
                    className="w-20"
                    value={qty[item.id] ?? remaining}
                    onChange={(e) =>
                      setQty((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                    }
                  />
                  <span className="text-muted-foreground">of {remaining} left</span>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Wrong item, duplicate charge, etc."
              required
              minLength={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
            />
            Return items to stock (when product tracks stock)
          </label>
          <p className="text-sm font-medium tabular-nums">Refund total: {formatRand(refundableCents)}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || refundableCents <= 0 || reason.trim().length < 3}
              onClick={submitRefund}
            >
              {pending ? 'Submitting…' : 'Submit refund'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setPurchaseId(null)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
