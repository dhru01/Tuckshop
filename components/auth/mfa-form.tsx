'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, startTransition } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function MfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const [error, setError] = useState<string>();
  const [factorId, setFactorId] = useState<string>();
  const [challengeId, setChallengeId] = useState<string>();
  const [qrSvg, setQrSvg] = useState<string>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];

    if (totp && totp.status === 'verified') {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      });
      if (chErr) {
        setError('Could not start MFA challenge. Try signing in again.');
        setLoading(false);
        return;
      }
      setFactorId(totp.id);
      setChallengeId(challenge.id);
      setLoading(false);
      return;
    }

    const { data: enroll, error: enErr } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
    });
    if (enErr || !enroll) {
      setError('Could not start MFA enrolment.');
      setLoading(false);
      return;
    }
    setFactorId(enroll.id);
    setQrSvg(enroll.totp.qr_code);
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: enroll.id,
    });
    if (chErr) {
      setError('Could not start MFA challenge.');
      setLoading(false);
      return;
    }
    setChallengeId(challenge.id);
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void bootstrap();
    });
  }, [bootstrap]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setError(undefined);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: verErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    setLoading(false);
    if (verErr) {
      setError('Invalid code. Try again.');
      return;
    }
    router.replace(next.startsWith('/') ? next : '/');
    router.refresh();
  }

  return (
    <AuthCard
      title="Multi-factor authentication"
      description="School and platform administrators must use an authenticator app."
    >
      <form onSubmit={onVerify} className="flex flex-col gap-4">
        <FormError message={error} />
        {qrSvg ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG data URL from Supabase MFA enrolment
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
            alt="Scan this QR code in your authenticator app"
            className="mx-auto size-48 rounded-md border border-border bg-white p-2"
          />
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
          {loading ? 'Please wait…' : 'Verify'}
        </Button>
      </form>
    </AuthCard>
  );
}
