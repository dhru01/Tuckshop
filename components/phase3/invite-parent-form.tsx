'use client';

import { useActionState } from 'react';

import { inviteParentAction, type ActionState } from '@/app/actions/phase3';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ActionState = {};

type LearnerOption = { id: string; first_name: string; last_name: string; admission_ref: string };

export function InviteParentForm({ learners }: { learners: LearnerOption[] }) {
  const [state, action, pending] = useActionState(inviteParentAction, initial);

  return (
    <form action={action} className="max-w-md space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Invite parent</h2>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {state.inviteUrl ? (
        <p className="break-all rounded bg-muted p-2 text-xs">{state.inviteUrl}</p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="learnerId">Learner</Label>
        <select
          id="learnerId"
          name="learnerId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {learners.map((l) => (
            <option key={l.id} value={l.id}>
              {l.first_name} {l.last_name} ({l.admission_ref})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Parent email (must match their login)</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create invite link'}</Button>
    </form>
  );
}
