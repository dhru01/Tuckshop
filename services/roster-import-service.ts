import 'server-only';

import type { NormalisedRosterRow } from '@/lib/roster/csv';
import {
  createLearnerWithWallet,
  createParentInvitation,
} from '@/services/tenancy-service';

export type RosterImportLineResult =
  | {
      line: number;
      status: 'ok';
      learnerName: string;
      grade: string;
      inviteUrl?: string;
    }
  | { line: number; status: 'error'; message: string };

export async function importRosterRows(
  actorId: string,
  schoolId: string,
  rows: { line: number; row: NormalisedRosterRow }[],
  appBaseUrl: string,
): Promise<RosterImportLineResult[]> {
  const results: RosterImportLineResult[] = [];

  for (const { line, row } of rows) {
    const { data: learner, error: learnerErr } = await createLearnerWithWallet(actorId, schoolId, {
      firstName: row.firstName,
      lastName: row.lastName,
      grade: row.grade,
      className: row.className,
      admissionRef: row.admissionRef,
    });

    if (learnerErr || !learner) {
      results.push({
        line,
        status: 'error',
        message: 'Could not create learner (duplicate admission_ref or school not active).',
      });
      continue;
    }

    const learnerName = `${row.firstName} ${row.lastName}`;

    if (row.guardianEmail) {
      const { data: inv, error: invErr } = await createParentInvitation(
        actorId,
        schoolId,
        learner.learner_id,
        row.guardianEmail,
      );

      if (invErr || !inv) {
        results.push({
          line,
          status: 'error',
          message: 'Learner created but parent invitation failed.',
        });
        continue;
      }

      results.push({
        line,
        status: 'ok',
        learnerName,
        grade: row.grade,
        inviteUrl: `${appBaseUrl}/invite/${inv.token}`,
      });
      continue;
    }

    results.push({
      line,
      status: 'ok',
      learnerName,
      grade: row.grade,
    });
  }

  return results;
}
