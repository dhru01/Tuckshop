'use client';

import { useActionState } from 'react';

import { createLearnerAction, type ActionState } from '@/app/actions/phase3';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ActionState = {};

export function CreateLearnerForm() {
  const [state, action, pending] = useActionState(createLearnerAction, initial);

  return (
    <form action={action} className="max-w-md space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Add learner</h2>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {state.inviteUrl ? (
        <p className="break-all rounded bg-muted p-2 text-xs">{state.inviteUrl}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="grade">Grade</Label>
          <Input id="grade" name="grade" required placeholder="Grade 5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="className">Class</Label>
          <Input id="className" name="className" placeholder="5A" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admissionRef">Admission / student number (optional)</Label>
        <Input id="admissionRef" name="admissionRef" placeholder="2025-001" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guardianEmail">Parent / caregiver email (optional)</Label>
        <Input
          id="guardianEmail"
          name="guardianEmail"
          type="email"
          placeholder="Creates an invite link when provided"
        />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add learner'}</Button>
    </form>
  );
}
