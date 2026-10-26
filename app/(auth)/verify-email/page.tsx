import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Verify email' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;
  const justRegistered = registered === '1';

  return (
    <AuthCard
      title="Verify your email"
      description={
        justRegistered
          ? 'We sent a confirmation link to your inbox. Open it to activate your account.'
          : 'You need a verified email before using Tuckshop.'
      }
    >
      <p className="text-sm text-muted-foreground">
        After confirming, return here and sign in. The link expires after a short time; you can
        register again if needed.
      </p>
      <Button asChild className="mt-4 w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </AuthCard>
  );
}
