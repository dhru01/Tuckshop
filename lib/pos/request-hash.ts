import { createHash } from 'node:crypto';

export type BasketLine = { productId: string; quantity: number };

/** Canonical hash for idempotency (items + credential). Server-only. */
export function buildCheckoutRequestHash(
  credentialReference: string,
  items: readonly BasketLine[],
): string {
  const sorted = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
  const payload = JSON.stringify({
    credential: credentialReference.trim().toLowerCase(),
    items: sorted.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
