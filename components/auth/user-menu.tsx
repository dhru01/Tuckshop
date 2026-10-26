'use client';

import { LogOut } from 'lucide-react';

import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut aria-hidden="true" />
        Sign out
      </Button>
    </form>
  );
}
