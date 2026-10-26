import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { requireActorForInterface } from '@/lib/auth/require-actor';

export const metadata: Metadata = { title: 'Settings' };

export default async function Page() {
  const access = await requireActorForInterface('parent');

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile and security." />
      <dl className="space-y-3 rounded-md border border-border bg-background p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{access.profile.first_name} {access.profile.last_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{access.profile.email}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Optional authenticator MFA is available if you also use a staff or admin role.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/select-context">Switch workspace</Link>
      </Button>
    </div>
  );
}
