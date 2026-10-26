'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { forgotPasswordAction, type AuthActionState } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);

  return (
    <AuthCard
      title="Reset password"
      description="We will email you a link to choose a new password."
    >
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state.error} />
        {state.success ? (
          <FormSuccess message="If an account exists for that email, you will receive a reset link shortly." />
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
      </form>
    </AuthCard>
  );
}
