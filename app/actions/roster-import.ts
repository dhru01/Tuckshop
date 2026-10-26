'use server';

import { revalidatePath } from 'next/cache';

import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import type { NormalisedRosterRow } from '@/lib/roster/csv';
import { isRosterUploadFile, parseRosterUpload } from '@/lib/roster/parse-upload';
import { importRosterRows, type RosterImportLineResult } from '@/services/roster-import-service';

export type RosterImportState = {
  error?: string;
  success?: string;
  results?: RosterImportLineResult[];
};

export async function importRosterAction(
  _prev: RosterImportState,
  formData: FormData,
): Promise<RosterImportState> {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school in your current context.' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to import.' };
  }

  if (!isRosterUploadFile(file.name)) {
    return {
      error: 'Upload an Excel (.xlsx) or CSV file with learner names and grade.',
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File is too large (max 5 MB).' };
  }

  const parsed = await parseRosterUpload(file);

  const only = parsed[0];
  if (parsed.length === 1 && only && !only.ok) {
    return { error: only.error };
  }

  const rows: { line: number; row: NormalisedRosterRow }[] = [];
  const rowErrors: RosterImportLineResult[] = [];

  for (const p of parsed) {
    if (p.ok) {
      rows.push({ line: p.line, row: p.row });
    } else {
      rowErrors.push({ line: p.line, status: 'error', message: p.error });
    }
  }

  if (rows.length === 0) {
    const first = rowErrors.find((r) => r.status === 'error');
    return {
      error: first && first.status === 'error' ? first.message : 'No valid rows to import.',
    };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const results = await importRosterRows(actorId(access), schoolId, rows, base);
  results.push(...rowErrors);
  results.sort((a, b) => a.line - b.line);

  const ok = results.filter((r) => r.status === 'ok').length;
  const failed = results.length - ok;

  revalidatePath('/school/learners');
  revalidatePath('/school/parents');

  return {
    success: `Imported ${ok} learner(s). ${failed} row(s) need attention.`,
    results,
  };
}
