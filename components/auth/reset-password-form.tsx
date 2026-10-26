'use client';

import { useActionState } from 'react';

import { resetPasswordAction, type AuthActionState } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <AuthCard title="Choose a new password" description="Enter a new password for your account.">
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state.error} />
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
}
