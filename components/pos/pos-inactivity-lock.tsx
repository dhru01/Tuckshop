'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { posReauthAction } from '@/app/actions/auth';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { POS_ACTIVITY_EVENTS, POS_INACTIVITY_MS } from '@/lib/pos/inactivity';

/**
 * Full-screen lock after idle time; cashier re-enters password to resume (no navigation away).
 */
export function PosInactivityLock({ enabled }: { enabled: boolean }) {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleLock = useCallback(() => {
    if (!enabled || locked) return;
    clearTimer();
    timerRef.current = setTimeout(() => setLocked(true), POS_INACTIVITY_MS);
  }, [clearTimer, enabled, locked]);

  const onActivity = useCallback(() => {
    if (!enabled || locked) return;
    scheduleLock();
  }, [enabled, locked, scheduleLock]);

  useEffect(() => {
    if (!enabled) return;
    scheduleLock();
    for (const event of POS_ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      clearTimer();
      for (const event of POS_ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [clearTimer, enabled, onActivity, scheduleLock]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    const result = await posReauthAction({}, formData);
    setPending(false);
    if (result.success) {
      setLocked(false);
      scheduleLock();
      return;
    }
    setError(result.error);
  }

  if (!enabled || !locked) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-lock-title"
    >
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="space-y-1">
          <h2 id="pos-lock-title" className="text-lg font-semibold">POS locked</h2>
          <p className="text-sm text-muted-foreground">
            This terminal was idle. Enter your password to continue selling.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="space-y-2">
            <Label htmlFor="pos-lock-password">Password</Label>
            <Input
              id="pos-lock-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-11 text-base"
            />
          </div>
          <Button type="submit" className="min-h-11 w-full text-base" disabled={pending}>
            {pending ? 'Checking…' : 'Unlock'}
          </Button>
        </form>
      </div>
    </div>
  );
}
