'use client';

import { useActionState } from 'react';

import { registerCardUidAction, type ActionState } from '@/app/actions/phase3';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ActionState = {};

type LearnerOption = { id: string; first_name: string; last_name: string; admission_ref: string };

export function RegisterCardForm({ learners }: { learners: LearnerOption[] }) {
  const [state, action, pending] = useActionState(registerCardUidAction, initial);

  return (
    <form action={action} className="max-w-md space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Register card UID</h2>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
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
              {l.first_name} {l.last_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="uid">Card UID</Label>
        <Input id="uid" name="uid" required placeholder="e.g. 04a1b2c3d4e5f6" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Register card'}</Button>
    </form>
  );
}
