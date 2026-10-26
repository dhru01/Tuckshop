import { describe, expect, it } from 'vitest';

import { parseProductCsv, parseProductMatrix, productCsvTemplate } from '@/lib/products/csv';

const categories = [{ name: 'Snacks' }, { name: 'Drinks' }];

describe('product CSV', () => {
  it('parses a valid row', () => {
    const csv = `${productCsvTemplate()}\nWater 500ml,,Drinks,8.00`;
    const { rows, errors } = parseProductCsv(csv, categories);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.name).toBe('Water 500ml');
    expect(rows[1]?.priceCents).toBe(800);
  });

  it('parses matrix rows (Excel-style)', () => {
    const { rows, errors } = parseProductMatrix(
      [
        ['name', 'barcode', 'category', 'price_rand'],
        ['=1+1', '', 'Snacks', '1.00'],
      ],
      categories,
    );
    expect(errors).toHaveLength(0);
    expect(rows[0]?.name).toBe("'=1+1");
    expect(rows[0]?.priceCents).toBe(100);
  });

  it('finds headers after a title row and accepts Price (R)', () => {
    const { rows, errors } = parseProductMatrix(
      [
        ['School tuck shop products'],
        ['Product Name', 'Category', 'Price (R)'],
        ['Sandwich', 'Food', '25.00'],
      ],
      [...categories, { name: 'Food' }],
    );
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Sandwich');
    expect(rows[0]?.priceCents).toBe(2500);
  });

  it('defaults category to Other when column is missing', () => {
    const withOther = [...categories, { name: 'Other' }];
    const { rows, errors } = parseProductMatrix(
      [
        ['name', 'price'],
        ['Chips', '5.00'],
      ],
      withOther,
    );
    expect(errors).toHaveLength(0);
    expect(rows[0]?.categoryName).toBe('Other');
  });

  it('rejects unknown categories', () => {
    const csv = 'name,barcode,category,price_rand\nFoo,,Food,1.00';
    const { errors } = parseProductCsv(csv, categories);
    expect(errors.some((e) => e.includes('unknown category'))).toBe(true);
  });
});
