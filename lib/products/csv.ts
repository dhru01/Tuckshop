import { sanitiseCsvCell } from '@/lib/roster/csv';
import { parseRandToCents } from '@/lib/wallets/money';

export type ProductCsvRow = {
  name: string;
  barcode: string | null;
  categoryName: string;
  priceCents: number;
};

const HEADERS = ['name', 'barcode', 'category', 'price_rand'] as const;

const NAME_ALIASES = [
  'name',
  'product',
  'product_name',
  'item',
  'item_name',
  'description',
  'title',
] as const;

const CATEGORY_ALIASES = ['category', 'cat', 'type', 'group', 'department'] as const;

const PRICE_ALIASES = [
  'price_rand',
  'price',
  'price_r',
  'price_rands',
  'selling_price',
  'unit_price',
  'amount',
  'retail',
] as const;

const BARCODE_ALIASES = ['barcode', 'barcode_optional', 'sku', 'ean', 'upc', 'code'] as const;

const HEADER_SCAN_ROWS = 25;
const DEFAULT_CATEGORY = 'Other';

export function productCsvTemplate(): string {
  return [HEADERS.join(','), 'Chips 25g,6001234567890,Snacks,5.00'].join('\n');
}

/** Normalise spreadsheet headers: "Price (R)" → price_r */
export function normaliseProductHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function headerIndex(headerRow: readonly string[], aliases: readonly string[]): number {
  const normalised = headerRow.map(normaliseProductHeader);
  for (const alias of aliases) {
    const i = normalised.indexOf(alias);
    if (i >= 0) return i;
  }
  for (let i = 0; i < normalised.length; i++) {
    const h = normalised[i];
    if (!h) continue;
    for (const alias of aliases) {
      if (h === alias || h.endsWith(`_${alias}`) || h.startsWith(`${alias}_`)) {
        return i;
      }
    }
  }
  return -1;
}

type ColumnIndices = {
  nameI: number;
  categoryI: number;
  priceI: number;
  barcodeI: number;
};

function columnIndices(headerRow: readonly string[]): ColumnIndices {
  return {
    nameI: headerIndex(headerRow, NAME_ALIASES),
    categoryI: headerIndex(headerRow, CATEGORY_ALIASES),
    priceI: headerIndex(headerRow, PRICE_ALIASES),
    barcodeI: headerIndex(headerRow, BARCODE_ALIASES),
  };
}

function findHeaderRow(
  matrix: readonly string[][],
): { rowIndex: number; indices: ColumnIndices } | null {
  const limit = Math.min(matrix.length, HEADER_SCAN_ROWS);
  for (let r = 0; r < limit; r++) {
    const row = matrix[r];
    if (!row?.some((cell) => cell.trim().length > 0)) continue;
    const indices = columnIndices(row);
    if (indices.nameI >= 0 && indices.priceI >= 0) {
      return { rowIndex: r, indices };
    }
  }
  return null;
}

function formatHeaderHint(matrix: readonly string[][]): string {
  const first = matrix.find((row) => row.some((cell) => cell.trim().length > 0));
  if (!first) return '';
  const labels = first.map((c) => c.trim()).filter(Boolean).slice(0, 8);
  if (labels.length === 0) return '';
  return ` Found: ${labels.join(', ')}.`;
}

export function parseProductMatrix(
  matrix: readonly string[][],
  knownCategories: readonly { name: string }[],
): { rows: ProductCsvRow[]; errors: string[] } {
  const nonEmpty = matrix.filter((row) => row.some((cell) => String(cell).trim().length > 0));
  if (nonEmpty.length < 2) {
    return { rows: [], errors: ['File must include a header row and at least one product.'] };
  }

  const located = findHeaderRow(nonEmpty);
  if (!located) {
    return {
      rows: [],
      errors: [
        `Could not find name and price columns in the first ${HEADER_SCAN_ROWS} rows.${formatHeaderHint(nonEmpty)} Use columns such as name, category, and price_rand (or Price (R)).`,
      ],
    };
  }

  const { rowIndex, indices } = located;
  const { nameI, priceI, barcodeI } = indices;
  const { categoryI } = indices;

  const categorySet = new Map(
    knownCategories.map((c) => [c.name.trim().toLowerCase(), c.name.trim()]),
  );
  const defaultCategory = categorySet.get(DEFAULT_CATEGORY.toLowerCase()) ?? null;

  if (categoryI < 0) {
    if (!defaultCategory) {
      return {
        rows: [],
        errors: [
          `Missing a category column.${formatHeaderHint(nonEmpty)} Add a category column or put every item in "${DEFAULT_CATEGORY}".`,
        ],
      };
    }
  }

  const rows: ProductCsvRow[] = [];
  const errors: string[] = [];

  for (let i = rowIndex + 1; i < nonEmpty.length; i++) {
    const lineNo = i + 1;
    const cols = nonEmpty[i]!.map((c) => sanitiseCsvCell(String(c)));
    const name = cols[nameI]?.trim() ?? '';
    if (!name) continue;

    const categoryRaw = categoryI >= 0 ? (cols[categoryI]?.trim() ?? '') : '';
    const categoryName =
      categoryRaw ? categorySet.get(categoryRaw.toLowerCase()) : defaultCategory;
    if (!categoryName) {
      errors.push(`Row ${lineNo}: unknown category "${categoryRaw}".`);
      continue;
    }

    const priceCents = parseRandToCents(cols[priceI] ?? '');
    if (priceCents === null) {
      errors.push(`Row ${lineNo}: invalid price.`);
      continue;
    }

    const barcode = barcodeI >= 0 ? cols[barcodeI]?.trim() || null : null;

    rows.push({
      name,
      barcode,
      categoryName,
      priceCents,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    return { rows: [], errors: ['No product rows found below the header.'] };
  }

  return { rows, errors };
}

export function parseProductCsv(
  text: string,
  knownCategories: readonly { name: string }[],
): { rows: ProductCsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const matrix = lines.map((line) => line.split(',').map((c) => sanitiseCsvCell(c)));
  return parseProductMatrix(matrix, knownCategories);
}
