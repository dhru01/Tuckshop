'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emitSimulatedTap } from '@/lib/nfc/simulated-reader';

export function SimulatedTapPanel({
  onUid,
  disabled,
}: {
  onUid: (uid: string) => void;
  disabled?: boolean;
}) {
  const [uid, setUid] = useState('');

  const fire = () => {
    const value = uid.trim();
    if (!value) return;
    emitSimulatedTap(value);
    onUid(value);
  };

  return (
    <div
      className="space-y-2 rounded-md border border-dashed border-amber-500/60 bg-amber-50/80 p-3 dark:bg-amber-950/30"
      role="region"
      aria-label="Simulated card reader"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
        Simulated reader — development only
      </p>
      <Label htmlFor="sim-uid">Tap or enter UID</Label>
      <div className="flex gap-2">
        <Input
          id="sim-uid"
          value={uid}
          disabled={disabled}
          onChange={(e) => setUid(e.target.value)}
          placeholder="53:b9:89:cd:74:00:01"
          className="min-h-11"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              fire();
            }
          }}
        />
        <Button type="button" disabled={disabled || !uid.trim()} onClick={fire} className="min-h-11 shrink-0">
          Simulate tap
        </Button>
      </div>
    </div>
  );
}
