import type { Metadata } from 'next';

import { clearContextAndSignOutAction } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'School suspended' };

export default function Page() {
  return (
    <AuthCard
      title="School suspended"
      description="This school account is temporarily suspended. Sales and top-ups are paused until the school is reactivated."
    >
      <form action={clearContextAndSignOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </AuthCard>
  );
}
