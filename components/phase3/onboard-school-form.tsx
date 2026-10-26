'use client';

import { useActionState } from 'react';

import { onboardSchoolAction, type ActionState } from '@/app/actions/phase3';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: ActionState = {};

export function OnboardSchoolForm() {
  const [state, action, pending] = useActionState(onboardSchoolAction, initial);

  return (
    <form action={action} className="max-w-md space-y-4 rounded-md border border-border bg-background p-4">
      <h2 className="text-sm font-medium">Onboard pilot school</h2>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="space-y-2">
        <Label htmlFor="name">School name</Label>
        <Input id="name" name="name" required placeholder="Demo Primary" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="schoolCode">School code (unique)</Label>
        <Input id="schoolCode" name="schoolCode" required placeholder="demo-primary" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminEmail">School admin email (must already be registered)</Label>
        <Input id="adminEmail" name="adminEmail" type="email" required placeholder="you@example.com" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create & activate'}</Button>
    </form>
  );
}
