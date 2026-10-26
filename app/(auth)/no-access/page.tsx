import type { Metadata } from 'next';
import Link from 'next/link';

import { clearContextAndSignOutAction } from '@/app/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'No access' };

const MESSAGES: Record<string, string> = {
  membership:
    'Your account is not linked to a school yet. Parents need an invitation from a school; staff need an administrator to invite them.',
  disabled: 'This account has been disabled. Contact your school or platform support.',
  school: 'The school linked to this account is no longer active.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason ?? 'membership'] ?? MESSAGES.membership;

  return (
    <AuthCard title="No access" description={message}>
      <div className="flex flex-col gap-2">
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
        <form action={clearContextAndSignOutAction}>
          <Button type="submit" variant="ghost" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
