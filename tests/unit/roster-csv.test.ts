import { describe, expect, it } from 'vitest';

import { parseRosterCsv, ROSTER_CSV_TEMPLATE, sanitiseCsvCell } from '@/lib/roster/csv';

describe('parseRosterCsv', () => {
  it('parses the template and normalises emails', () => {
    const lines = parseRosterCsv(ROSTER_CSV_TEMPLATE);
    const ok = lines.filter((l) => l.ok);
    expect(ok.length).toBe(1);
    if (ok[0]?.ok) {
      expect(ok[0].row.firstName).toBe('Thabo');
      expect(ok[0].row.guardianEmail).toBe('parent@example.com');
    }
  });

  it('rejects rows missing required fields', () => {
    const csv = `first_name,last_name,grade,guardian_email
,Smith,Grade 1,test@example.com`;
    const lines = parseRosterCsv(csv);
    expect(lines.some((l) => !l.ok)).toBe(true);
  });
});

describe('sanitiseCsvCell', () => {
  it('prefixes formula-like values', () => {
    expect(sanitiseCsvCell('=1+1')).toBe("'=1+1");
  });
});
