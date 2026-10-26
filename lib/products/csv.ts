import { sanitiseCsvCell } from '@/lib/roster/csv';
import { parseRandToCents } from '@/lib/wallets/money';

export type ProductCsvRow = {
  name: string;
  barcode: string | null;
  categoryName: string;
  priceCents: number;
  costPriceCents: number | null;
  trackStock: boolean;
  initialStock: number;
  lowStockThreshold: number | null;
};

const HEADERS = [
  'name',
  'barcode',
  'category',
  'price_rand',
  'cost_rand',
  'track_stock',
  'stock_quantity',
  'low_stock_threshold',
] as const;

export function productCsvTemplate(): string {
  return [
    HEADERS.join(','),
    'Chips 25g,6001234567890,Snacks,5.00,3.50,yes,24,6',
  ].join('\n');
}

export function parseProductCsv(
  text: string,
  knownCategories: readonly { name: string }[],
): { rows: ProductCsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must include a header row and at least one product.'] };
  }

  const header = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const nameI = idx('name');
  const barcodeI = idx('barcode');
  const categoryI = idx('category');
  const priceI = idx('price_rand');
  const costI = idx('cost_rand');
  const trackI = idx('track_stock');
  const stockI = idx('stock_quantity');
  const lowI = idx('low_stock_threshold');

  if (nameI < 0 || categoryI < 0 || priceI < 0) {
    return {
      rows: [],
      errors: ['Header must include name, category, and price_rand columns.'],
    };
  }

  const categorySet = new Map(
    knownCategories.map((c) => [c.name.trim().toLowerCase(), c.name.trim()]),
  );

  const rows: ProductCsvRow[] = [];

  for (let lineNo = 2; lineNo <= lines.length; lineNo++) {
    const cols = lines[lineNo - 1]!.split(',').map((c) => sanitiseCsvCell(c));
    const name = cols[nameI]?.trim() ?? '';
    if (!name) {
      errors.push(`Row ${lineNo}: name is required.`);
      continue;
    }

    const categoryRaw = cols[categoryI]?.trim() ?? '';
    const categoryName = categorySet.get(categoryRaw.toLowerCase());
    if (!categoryName) {
      errors.push(`Row ${lineNo}: unknown category "${categoryRaw}".`);
      continue;
    }

    const priceCents = parseRandToCents(cols[priceI] ?? '');
    if (priceCents === null) {
      errors.push(`Row ${lineNo}: invalid price_rand.`);
      continue;
    }

    const costRaw = costI >= 0 ? cols[costI]?.trim() : '';
    const costPriceCents = costRaw ? parseRandToCents(costRaw) : null;
    if (costRaw && costPriceCents === null) {
      errors.push(`Row ${lineNo}: invalid cost_rand.`);
      continue;
    }

    const trackRaw = (trackI >= 0 ? cols[trackI] : '')?.trim().toLowerCase() ?? '';
    const trackStock = trackRaw === 'yes' || trackRaw === 'true' || trackRaw === '1';

    const stockRaw = stockI >= 0 ? cols[stockI]?.trim() : '0';
    const initialStock = stockRaw ? Number.parseInt(stockRaw, 10) : 0;
    if (!Number.isSafeInteger(initialStock) || initialStock < 0) {
      errors.push(`Row ${lineNo}: stock_quantity must be a non-negative integer.`);
      continue;
    }

    const lowRaw = lowI >= 0 ? cols[lowI]?.trim() : '';
    const lowStockThreshold = lowRaw ? Number.parseInt(lowRaw, 10) : null;
    if (lowRaw && (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold! < 0)) {
      errors.push(`Row ${lineNo}: low_stock_threshold must be a non-negative integer.`);
      continue;
    }

    const barcode = barcodeI >= 0 ? cols[barcodeI]?.trim() || null : null;

    rows.push({
      name,
      barcode,
      categoryName,
      priceCents,
      costPriceCents,
      trackStock,
      initialStock: trackStock ? initialStock : 0,
      lowStockThreshold,
    });
  }

  return { rows, errors };
}

export function exportProductsCsv(
  products: readonly {
    name: string;
    barcode: string | null;
    categoryName: string;
    priceCents: number;
    costPriceCents: number | null;
    trackStock: boolean;
    stockQuantity: number;
    lowStockThreshold: number | null;
  }[],
): string {
  const lines = [HEADERS.join(',')];
  for (const p of products) {
    const price = (p.priceCents / 100).toFixed(2);
    const cost =
      p.costPriceCents !== null && p.costPriceCents !== undefined
        ? (p.costPriceCents / 100).toFixed(2)
        : '';
    const row = [
      sanitiseCsvCell(p.name),
      p.barcode ? sanitiseCsvCell(p.barcode) : '',
      sanitiseCsvCell(p.categoryName),
      price,
      cost,
      p.trackStock ? 'yes' : 'no',
      String(p.trackStock ? p.stockQuantity : 0),
      p.lowStockThreshold !== null && p.lowStockThreshold !== undefined
        ? String(p.lowStockThreshold)
        : '',
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}
