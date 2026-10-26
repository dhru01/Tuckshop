/** Strip CSV formula-injection prefixes when exporting or displaying imported cells. */
export function sanitiseCsvCell(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) return `'${trimmed}`;
  return trimmed;
}

/**
 * Minimal RFC 4180-style CSV parser (quoted fields, commas). No dependency for pilot imports.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field);
      field = '';
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      if (ch === '\r') i++;
      continue;
    }
    if (ch === '\r') {
      row.push(field);
      field = '';
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  row.push(field);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);

  return rows;
}

const HEADER_ALIASES: Record<string, keyof NormalisedRosterRow> = {
  student_first_name: 'firstName',
  first_name: 'firstName',
  learner_first_name: 'firstName',
  firstname: 'firstName',
  student_last_name: 'lastName',
  last_name: 'lastName',
  learner_last_name: 'lastName',
  lastname: 'lastName',
  grade: 'grade',
  class: 'className',
  class_name: 'className',
  admission_ref: 'admissionRef',
  student_number: 'admissionRef',
  admission_number: 'admissionRef',
  guardian_email: 'guardianEmail',
  parent_email: 'guardianEmail',
  caregiver_email: 'guardianEmail',
  email: 'guardianEmail',
  guardian_first_name: 'guardianFirstName',
  parent_first_name: 'guardianFirstName',
  caregiver_first_name: 'guardianFirstName',
  guardian_last_name: 'guardianLastName',
  parent_last_name: 'guardianLastName',
  caregiver_last_name: 'guardianLastName',
};

export type NormalisedRosterRow = {
  firstName: string;
  lastName: string;
  grade: string;
  className?: string;
  admissionRef?: string;
  guardianEmail: string;
  guardianFirstName?: string;
  guardianLastName?: string;
};

export type ParsedRosterLine =
  | { line: number; ok: true; row: NormalisedRosterRow }
  | { line: number; ok: false; error: string };

export const ROSTER_IMPORT_MAX_ROWS = 500;

function normaliseHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseRosterCsv(text: string): ParsedRosterLine[] {
  const matrix = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (matrix.length === 0) {
    return [{ line: 1, ok: false, error: 'File is empty.' }];
  }

  const headerCells = matrix[0];
  if (!headerCells) {
    return [{ line: 1, ok: false, error: 'File is empty.' }];
  }
  const headerRow = headerCells.map(normaliseHeader);
  const columnIndex: Partial<Record<keyof NormalisedRosterRow, number>> = {};

  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (!header) continue;
    const key = HEADER_ALIASES[header];
    if (key) columnIndex[key] = i;
  }

  const required: (keyof NormalisedRosterRow)[] = ['firstName', 'lastName', 'grade', 'guardianEmail'];
  const missing = required.filter((k) => columnIndex[k] === undefined);
  if (missing.length > 0) {
    return [
      {
        line: 1,
        ok: false,
        error: `Missing columns: ${missing.join(', ')}. Use the template (first_name, last_name, grade, guardian_email).`,
      },
    ];
  }

  const dataLines = matrix.slice(1);
  if (dataLines.length > ROSTER_IMPORT_MAX_ROWS) {
    return [
      {
        line: 1,
        ok: false,
        error: `Too many rows (${dataLines.length}). Maximum is ${ROSTER_IMPORT_MAX_ROWS}.`,
      },
    ];
  }

  const out: ParsedRosterLine[] = [];
  for (let r = 0; r < dataLines.length; r++) {
    const line = r + 2;
    const cells = dataLines[r] ?? [];
    const pick = (key: keyof NormalisedRosterRow): string => {
      const idx = columnIndex[key];
      if (idx === undefined) return '';
      return sanitiseCsvCell(cells[idx] ?? '');
    };

    const firstName = pick('firstName');
    const lastName = pick('lastName');
    const grade = pick('grade');
    const guardianEmail = pick('guardianEmail').toLowerCase();

    if (!firstName || !lastName || !grade || !guardianEmail) {
      out.push({ line, ok: false, error: 'first_name, last_name, grade and guardian_email are required.' });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      out.push({ line, ok: false, error: 'Invalid guardian_email.' });
      continue;
    }

    const className = pick('className');
    const admissionRef = pick('admissionRef');
    const guardianFirstName = pick('guardianFirstName');
    const guardianLastName = pick('guardianLastName');

    out.push({
      line,
      ok: true,
      row: {
        firstName,
        lastName,
        grade,
        guardianEmail,
        ...(className ? { className } : {}),
        ...(admissionRef ? { admissionRef } : {}),
        ...(guardianFirstName ? { guardianFirstName } : {}),
        ...(guardianLastName ? { guardianLastName } : {}),
      },
    });
  }

  return out;
}

export const ROSTER_CSV_TEMPLATE = `first_name,last_name,grade,class_name,admission_ref,guardian_email,guardian_first_name,guardian_last_name
Thabo,Mokoena,Grade 5,5A,2025-001,parent@example.com,Sipho,Mokoena
`;
