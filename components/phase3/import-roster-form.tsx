'use client';

import { useActionState } from 'react';

import { importRosterAction, type RosterImportState } from '@/app/actions/roster-import';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { ROSTER_CSV_TEMPLATE } from '@/lib/roster/csv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: RosterImportState = {};

function downloadTemplate() {
  const blob = new Blob([ROSTER_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tuckshop-roster-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportRosterForm() {
  const [state, action, pending] = useActionState(importRosterAction, initial);

  return (
    <div className="max-w-2xl space-y-4 rounded-md border border-border bg-background p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Import learners & caregivers</h2>
        <p className="text-xs text-muted-foreground">
          Upload a CSV with each learner and their parent/caregiver email. We create the learner and
          send an invite link for that email.{' '}
          <strong className="font-medium text-foreground">ID numbers are not required</strong> for
          the pilot — guardians sign in with the invited email.
        </p>
        <p className="text-xs text-muted-foreground">
          Excel: <span className="text-foreground">File → Save As → CSV (UTF-8)</span>.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
        Download CSV template
      </Button>
      <form action={action} className="space-y-4">
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
        <div className="space-y-2">
          <Label htmlFor="rosterFile">CSV file</Label>
          <Input id="rosterFile" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <Button type="submit" disabled={pending}>{pending ? 'Importing…' : 'Import roster'}</Button>
      </form>
      {state.results && state.results.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-md border border-border text-xs">
          <table className="w-full">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Row</th>
                <th className="p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {state.results.map((r) => (
                <tr key={r.line} className="border-t border-border">
                  <td className="p-2 align-top">{r.line}</td>
                  <td className="p-2">
                    {r.status === 'ok' ? (
                      <span>
                        {r.learnerName} ({r.admissionRef}) → {r.guardianEmail}
                        <span className="mt-1 block break-all text-muted-foreground">{r.inviteUrl}</span>
                      </span>
                    ) : (
                      <span className="text-destructive">{r.message}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
