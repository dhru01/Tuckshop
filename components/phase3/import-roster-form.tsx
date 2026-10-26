'use client';

import { useActionState, useEffect, useState } from 'react';

import { importRosterAction, type RosterImportState } from '@/app/actions/roster-import';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: RosterImportState = {};
const SUCCESS_VISIBLE_MS = 4000;

export function ImportRosterForm() {
  const [state, action, pending] = useActionState(importRosterAction, initial);
  const [shownSuccess, setShownSuccess] = useState<string | undefined>();
  const [prevSuccess, setPrevSuccess] = useState<string | undefined>();

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    setShownSuccess(state.success);
  }

  useEffect(() => {
    if (!shownSuccess) return;
    const timer = setTimeout(() => setShownSuccess(undefined), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [shownSuccess]);

  return (
    <div className="max-w-2xl space-y-4 rounded-md border border-border bg-background p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Import learners</h2>
        <p className="text-xs text-muted-foreground">
          Upload an Excel or CSV file with each learner&apos;s name and grade. Use columns such as{' '}
          <span className="text-foreground">first_name</span>,{' '}
          <span className="text-foreground">last_name</span>, and{' '}
          <span className="text-foreground">grade</span>, or a single{' '}
          <span className="text-foreground">name</span> column plus{' '}
          <span className="text-foreground">grade</span>. Parent email is optional — when included,
          we create an invite link for that row.
        </p>
      </div>
      <form action={action} className="space-y-4">
        <FormError message={state.error} />
        <FormSuccess message={shownSuccess} />
        <div className="space-y-2">
          <Label htmlFor="rosterFile">Excel or CSV file</Label>
          <Input
            id="rosterFile"
            name="file"
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv,text/csv"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import file'}
        </Button>
      </form>
    </div>
  );
}
