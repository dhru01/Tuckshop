import { parseProductMatrix } from '@/lib/products/csv';

const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm']);

export function productUploadExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return '';
  return fileName.slice(dot).toLowerCase();
}

export function isProductUploadFile(fileName: string): boolean {
  return EXCEL_EXTENSIONS.has(productUploadExtension(fileName));
}

/** Parse a product catalogue Excel upload. First worksheet only. */
export async function parseProductUpload(
  file: File,
  knownCategories: readonly { name: string }[],
) {
  if (!isProductUploadFile(file.name)) {
    return {
      rows: [],
      errors: ['Upload an Excel file (.xlsx).'],
    };
  }

  const buffer = await file.arrayBuffer();
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ['Workbook has no sheets.'] };
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { rows: [], errors: ['Could not read the first worksheet.'] };
  }
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const asStrings = matrix.map((row) =>
    (row ?? []).map((cell) => String(cell ?? '').trim()),
  );
  return parseProductMatrix(asStrings, knownCategories);
}
