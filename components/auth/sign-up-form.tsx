'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signUpAction, type AuthActionState } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: AuthActionState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);

  return (
    <AuthCard title="Create account" description="Parents can register to link to learners later.">
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" autoComplete="given-name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" autoComplete="family-name" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
