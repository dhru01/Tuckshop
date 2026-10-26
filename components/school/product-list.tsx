'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useDeferredValue, useMemo, useState } from 'react';

import {
  archiveProductAction,
  updateProductAction,
  type ProductActionState,
} from '@/app/actions/products';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRand } from '@/lib/wallets/money';

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  priceCents: number;
  isActive: boolean;
  categoryId: string;
  imageUrl: string | null;
};

const ALL_TAB = 'all';
const initial: ProductActionState = {};

function EditProductForm({
  product,
  categories,
}: {
  product: ProductRow;
  categories: readonly { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateProductAction, initial);
  const price = (product.priceCents / 100).toFixed(2);
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
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={product.isActive} />
            Show on POS
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

function ProductListItems({
  products,
  categories,
  openId,
  setOpenId,
  deleting,
  removeProduct,
}: {
  products: ProductRow[];
  categories: readonly { id: string; name: string }[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  deleting: string | null;
  removeProduct: (id: string, name: string) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        No products match your filters.
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Hidden from POS
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground">
                  {formatRand(p.priceCents)}
                  {p.barcode ? ` · ${p.barcode}` : ''}
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
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={deleting === p.id}
                onClick={() => removeProduct(p.id, p.name)}
              >
                {deleting === p.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
            {open ? <EditProductForm product={p} categories={categories} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function matchesSearch(product: ProductRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.barcode?.toLowerCase().includes(q)) return true;
  return false;
}

export function ProductList({
  products,
  categories,
  posProductCount,
}: {
  products: ProductRow[];
  categories: readonly { id: string; name: string }[];
  posProductCount: number;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [listFeedback, setListFeedback] = useState<ProductActionState>({});
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const removeProduct = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Delete "${name}"? It will be removed from the tuck shop catalogue and POS.`,
      )
    ) {
      return;
    }
    setDeleting(id);
    setListFeedback({});
    const result = await archiveProductAction(id);
    setDeleting(null);
    if (result.error) {
      setListFeedback({ error: result.error });
      return;
    }
    if (openId === id) setOpenId(null);
    setListFeedback({ success: result.success });
    router.refresh();
  };

  const filteredBySearch = useMemo(
    () => products.filter((p) => matchesSearch(p, deferredSearch)),
    [products, deferredSearch],
  );

  const suggestions = useMemo(() => {
    if (searchQuery.trim().length < 1) return [];
    return products.filter((p) => matchesSearch(p, searchQuery)).slice(0, 8);
  }, [products, searchQuery]);

  const countForCategory = (categoryId: string) =>
    filteredBySearch.filter((p) => p.categoryId === categoryId).length;

  const allCount = filteredBySearch.length;

  if (products.length === 0) {
    return (
      <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        No products yet. Add one manually or import an Excel file.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Catalogue</h2>
        <p className="text-xs text-muted-foreground">
          {posProductCount} product{posProductCount === 1 ? '' : 's'} on the school POS. Items with
          &ldquo;Show on POS&rdquo; enabled use the same names, prices, and categories as the till.
        </p>
      </div>
      <FormError message={listFeedback.error} />
      <FormSuccess message={listFeedback.success} />

      <div className="relative max-w-md space-y-1">
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or barcode…"
          className={searchQuery ? 'pr-9' : undefined}
          aria-label="Search products"
          aria-autocomplete="list"
          autoComplete="off"
        />
        {searchQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
        {suggestions.length > 0 && searchQuery.trim() ? (
          <ul
            className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md"
            role="listbox"
          >
            {suggestions.map((p) => (
              <li key={p.id} role="option" aria-selected="false">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-muted"
                  onClick={() => setSearchQuery(p.name)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value={ALL_TAB} className="text-xs sm:text-sm">
            All ({allCount})
          </TabsTrigger>
          {categories.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="text-xs sm:text-sm">
              {c.name} ({countForCategory(c.id)})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={ALL_TAB} className="mt-0">
          <ProductListItems
            products={filteredBySearch}
            categories={categories}
            openId={openId}
            setOpenId={setOpenId}
            deleting={deleting}
            removeProduct={removeProduct}
          />
        </TabsContent>
        {categories.map((c) => {
          const tabProducts = filteredBySearch.filter((p) => p.categoryId === c.id);
          return (
            <TabsContent key={c.id} value={c.id} className="mt-0">
              <ProductListItems
                products={tabProducts}
                categories={categories}
                openId={openId}
                setOpenId={setOpenId}
                deleting={deleting}
                removeProduct={removeProduct}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
