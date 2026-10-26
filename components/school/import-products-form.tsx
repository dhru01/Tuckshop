'use client';

import { useActionState } from 'react';

import { importProductsAction, type ProductActionState } from '@/app/actions/products';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ProductActionState = {};

export function ImportProductsForm() {
  const [state, action, pending] = useActionState(importProductsAction, initial);

  return (
    <form action={action} className="space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Import products</h2>
      <p className="text-xs text-muted-foreground">
        Upload an Excel file with at least{' '}
        <span className="text-foreground">name</span> and{' '}
        <span className="text-foreground">price</span> columns.{' '}
        <span className="text-foreground">category</span> and barcode are optional (missing category
        uses Other). Categories must match your catalogue when provided (Food, Snacks, Drinks,
        Stationery, Other).
      </p>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="space-y-1">
        <Label htmlFor="product-file">Excel file</Label>
        <Input
          id="product-file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          required
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Importing…' : 'Import'}
      </Button>
    </form>
  );
}
