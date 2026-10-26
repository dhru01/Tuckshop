import { describe, expect, it } from 'vitest';

import { exportProductsCsv, parseProductCsv, productCsvTemplate } from '@/lib/products/csv';

const categories = [{ name: 'Snacks' }, { name: 'Drinks' }];

describe('product CSV', () => {
  it('parses a valid row', () => {
    const csv = `${productCsvTemplate()}\nWater 500ml,,Drinks,8.00,,no,0,`;
    const { rows, errors } = parseProductCsv(csv, categories);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.name).toBe('Water 500ml');
    expect(rows[1]?.priceCents).toBe(800);
  });

  it('sanitises formula injection in export', () => {
    const csv = exportProductsCsv([
      {
        name: '=1+1',
        barcode: null,
        categoryName: 'Snacks',
        priceCents: 100,
        costPriceCents: null,
        trackStock: false,
        stockQuantity: 0,
        lowStockThreshold: null,
      },
    ]);
    expect(csv).toContain("'=1+1");
  });

  it('rejects unknown categories', () => {
    const csv = 'name,barcode,category,price_rand\nFoo,,Food,1.00';
    const { errors } = parseProductCsv(csv, categories);
    expect(errors.some((e) => e.includes('unknown category'))).toBe(true);
  });
});
