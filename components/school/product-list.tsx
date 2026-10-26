'use client';

import { useActionState, useState } from 'react';

import {
  archiveProductAction,
  updateProductAction,
  type ProductActionState,
} from '@/app/actions/products';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRand } from '@/lib/wallets/money';

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  priceCents: number;
  costPriceCents: number | null;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number | null;
  isActive: boolean;
  categoryId: string;
  imageUrl: string | null;
};

const initial: ProductActionState = {};

function lowStock(p: ProductRow): boolean {
  return (
    p.trackStock &&
    p.lowStockThreshold !== null &&
    p.lowStockThreshold !== undefined &&
    p.stockQuantity <= p.lowStockThreshold
  );
}

function EditProductForm({
  product,
  categories,
}: {
  product: ProductRow;
  categories: readonly { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateProductAction, initial);
  const price = (product.priceCents / 100).toFixed(2);
  const cost =
    product.costPriceCents !== null && product.costPriceCents !== undefined
      ? (product.costPriceCents / 100).toFixed(2)
      : '';

  return (
    <form action={action} className="mt-3 space-y-3 border-t border-border pt-3">
      <input type="hidden" name="productId" value={product.id} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Name</Label>
          <Input name="name" defaultValue={product.name} required />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <select
            name="categoryId"
            defaultValue={product.categoryId}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Price (R)</Label>
          <Input name="price" defaultValue={price} required />
        </div>
        <div className="space-y-1">
          <Label>Barcode</Label>
          <Input name="barcode" defaultValue={product.barcode ?? ''} />
        </div>
        <div className="space-y-1">
          <Label>Cost (R)</Label>
          <Input name="cost" defaultValue={cost} />
        </div>
        <div className="space-y-1">
          <Label>Low-stock alert</Label>
          <Input
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={product.lowStockThreshold ?? ''}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input name="trackStock" type="checkbox" defaultChecked={product.trackStock} />
            Track stock
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={product.isActive} />
            Active in POS
          </label>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Product image (JPEG/PNG/WebP, max 2 MB)</Label>
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
    </form>
  );
}

export function ProductList({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: readonly { id: string; name: string }[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);

  const archive = async (id: string) => {
    setArchiving(id);
    await archiveProductAction(id);
    setArchiving(null);
  };

  if (products.length === 0) {
    return (
      <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        No products yet. Add one manually or import a CSV.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border border-border bg-background">
      {products.map((p) => {
        const open = openId === p.id;
        return (
          <li key={p.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {!p.isActive ? (
                    <StatusBadge tone="neutral">Inactive</StatusBadge>
                  ) : null}
                  {lowStock(p) ? (
                    <StatusBadge tone="warning">Low stock</StatusBadge>
                  ) : null}
                </div>
                <p className="text-muted-foreground">
                  {formatRand(p.priceCents)}
                  {p.barcode ? ` · ${p.barcode}` : ''}
                  {p.trackStock ? ` · Stock ${p.stockQuantity}` : ' · No stock tracking'}
                </p>
              </div>
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- school-uploaded product photo
                <img
                  src={p.imageUrl}
                  alt=""
                  className="size-12 rounded object-cover"
                />
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setOpenId(open ? null : p.id)}
              >
                {open ? 'Close' : 'Edit'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={archiving === p.id}
                onClick={() => archive(p.id)}
              >
                {archiving === p.id ? '…' : 'Archive'}
              </Button>
            </div>
            {open ? <EditProductForm product={p} categories={categories} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
