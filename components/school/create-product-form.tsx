'use client';

import { useActionState } from 'react';

import { createProductAction, type ProductActionState } from '@/app/actions/products';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ProductActionState = {};

export function CreateProductForm({
  categories,
}: {
  categories: readonly { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createProductAction, initial);

  return (
    <form action={action} className="space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Add product</h2>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="product-name">Name</Label>
          <Input id="product-name" name="name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="product-category">Category</Label>
          <select
            id="product-category"
            name="categoryId"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="product-price">Price (R)</Label>
          <Input id="product-price" name="price" placeholder="5.00" required />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="product-barcode">Barcode (optional)</Label>
          <Input id="product-barcode" name="barcode" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="product-desc">Description (optional)</Label>
          <Input id="product-desc" name="description" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add product'}</Button>
    </form>
  );
}
