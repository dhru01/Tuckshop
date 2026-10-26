'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { signInAction, type AuthActionState } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: AuthActionState = {};

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <AuthCard title="Sign in" description="Sign in to your Tuckshop account.">
      <form action={action} className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <FormError message={state.error} />
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
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link href="/register" className="font-medium underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
