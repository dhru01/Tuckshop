import type { Metadata } from 'next';

import { AcceptInviteForm } from '@/components/phase3/accept-invite-form';
import { AuthCard } from '@/components/auth/auth-card';

export const metadata: Metadata = { title: 'Accept invitation' };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <main className="w-full max-w-md">
        <AuthCard title="Link to your child" description="Accept this school invitation with your parent account.">
          <AcceptInviteForm token={token} />
        </AuthCard>
      </main>
    </div>
  );
}
