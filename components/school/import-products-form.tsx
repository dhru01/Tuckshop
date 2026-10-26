'use client';

import { useActionState } from 'react';

import { importProductsAction, type ProductActionState } from '@/app/actions/products';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { productCsvTemplate } from '@/lib/products/csv';

const initial: ProductActionState = {};

export function ImportProductsForm() {
  const [state, action, pending] = useActionState(importProductsAction, initial);

  const downloadTemplate = () => {
    const blob = new Blob([productCsvTemplate()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <form action={action} className="space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Import CSV</h2>
      <p className="text-xs text-muted-foreground">
        Categories must match your school catalogue (Food, Snacks, Drinks, Stationery, Other).
      </p>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="space-y-1">
        <Label htmlFor="product-csv">CSV file</Label>
        <Input id="product-csv" name="file" type="file" accept=".csv,text/csv" required />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Importing…' : 'Import'}
        </Button>
        <Button type="button" variant="outline" onClick={downloadTemplate}>
          Download template
        </Button>
      </div>
    </form>
  );
}
