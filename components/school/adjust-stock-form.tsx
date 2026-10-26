'use client';

import { useActionState } from 'react';

import { adjustStockAction, type ProductActionState } from '@/app/actions/products';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ProductActionState = {};

export function AdjustStockForm({
  products,
}: {
  products: readonly { id: string; name: string; stockQuantity: number }[];
}) {
  const [state, action, pending] = useActionState(adjustStockAction, initial);

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add products with stock tracking enabled to adjust inventory.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Adjust stock</h2>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="adj-product">Product</Label>
          <select
            id="adj-product"
            name="productId"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (on hand: {p.stockQuantity})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-type">Type</Label>
          <select
            id="adj-type"
            name="movementType"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="restock">Restock</option>
            <option value="adjustment">Adjustment</option>
            <option value="write_off">Write-off</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-qty">Quantity</Label>
          <Input id="adj-qty" name="quantity" type="number" min={1} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-direction">Adjustment direction</Label>
          <select
            id="adj-direction"
            name="direction"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="add">Add to stock</option>
            <option value="remove">Remove from stock</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="adj-reason">Reason</Label>
          <Input id="adj-reason" name="reason" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-supplier">Supplier (restock)</Label>
          <Input id="adj-supplier" name="supplier" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adj-cost">Unit cost (R)</Label>
          <Input id="adj-cost" name="unitCost" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="adj-notes">Notes</Label>
          <Input id="adj-notes" name="notes" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Updating…' : 'Update stock'}</Button>
    </form>
  );
}
