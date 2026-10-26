import { parseRosterCsv, parseRosterMatrix, type ParsedRosterLine } from '@/lib/roster/csv';

const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm']);
const TEXT_EXTENSIONS = new Set(['.csv', '.txt']);

export function rosterUploadExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return '';
  return fileName.slice(dot).toLowerCase();
}

export function isRosterUploadFile(fileName: string): boolean {
  const ext = rosterUploadExtension(fileName);
  return EXCEL_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(ext);
}

/** Parse a roster upload (CSV or Excel). First worksheet only for Excel. */
export async function parseRosterUpload(file: File): Promise<ParsedRosterLine[]> {
  const ext = rosterUploadExtension(file.name);
  if (EXCEL_EXTENSIONS.has(ext)) {
    const buffer = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [{ line: 1, ok: false, error: 'Workbook has no sheets.' }];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [{ line: 1, ok: false, error: 'Could not read the first worksheet.' }];
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    const asStrings = matrix.map((row) =>
      (row ?? []).map((cell) => String(cell ?? '').trim()),
    );
    return parseRosterMatrix(asStrings);
  }

  const text = await file.text();
  return parseRosterCsv(text);
}
