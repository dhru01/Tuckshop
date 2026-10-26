'use client';

import { useState } from 'react';

import { closeShiftAction, ensurePosDeviceAction, openShiftAction } from '@/app/actions/pos';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SESSION_KEY = 'tuckshop.pos.session';

export function PosShiftPanel({ hasOpenShift }: { hasOpenShift: boolean }) {
  const [deviceName, setDeviceName] = useState('Tuckshop terminal');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  const sessionRaw = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
  const session = sessionRaw ? (JSON.parse(sessionRaw) as { shiftId: string }) : null;

  const openShift = async () => {
    setPending(true);
    setError(undefined);
    setSuccess(undefined);
    const device = await ensurePosDeviceAction(deviceName);
    if (device.error || !device.posDeviceId) {
      setError(device.error ?? 'Device error');
      setPending(false);
      return;
    }
    const opened = await openShiftAction(device.posDeviceId);
    if (opened.error || !opened.shiftId) {
      setError(opened.error ?? 'Could not open shift');
      setPending(false);
      return;
    }
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ shiftId: opened.shiftId, posDeviceId: device.posDeviceId }),
    );
    window.dispatchEvent(new Event('tuckshop:pos-session'));
    setSuccess('Shift opened. You can sell from the Sell screen.');
    setPending(false);
  };

  const closeShift = async () => {
    if (!session?.shiftId) return;
    setPending(true);
    setError(undefined);
    const result = await closeShiftAction(session.shiftId, notes);
    if (result.error) setError(result.error);
    else {
      setSuccess(result.success ?? 'Shift closed.');
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new Event('tuckshop:pos-session'));
    }
    setPending(false);
  };

  const active = Boolean(session?.shiftId) || hasOpenShift;

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-background p-6">
      <FormError message={error} />
      <FormSuccess message={success} />
      {active ? (
        <>
          <p className="text-sm text-muted-foreground">A shift is open on this browser.</p>
          <div className="space-y-1">
            <Label htmlFor="shift-notes">Closing notes (optional)</Label>
            <Input id="shift-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="button" className="min-h-12 w-full" disabled={pending} onClick={closeShift}>
            {pending ? 'Closing…' : 'Close shift'}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="device-name">Device name</Label>
            <Input
              id="device-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="min-h-11"
            />
          </div>
          <Button type="button" className="min-h-12 w-full" disabled={pending} onClick={openShift}>
            {pending ? 'Opening…' : 'Open shift'}
          </Button>
        </>
      )}
    </div>
  );
}
