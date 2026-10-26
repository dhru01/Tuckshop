'use client';

import { useActionState } from 'react';

import { pilotFundWalletAction, type LedgerActionState } from '@/app/actions/ledger';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: LedgerActionState = {};

export function PilotFundForm({
  walletId,
  learnerName,
}: {
  walletId: string;
  learnerName: string;
}) {
  const [state, action, pending] = useActionState(pilotFundWalletAction, initial);

  return (
    <form action={action} className="space-y-3 pt-3">
      <input type="hidden" name="walletId" value={walletId} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <p className="text-xs font-medium text-muted-foreground">Update wallet balance</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`amt-${walletId}`}>Amount (R)</Label>
          <Input id={`amt-${walletId}`} name="amount" placeholder="50" className="w-28" inputMode="decimal" />
        </div>
        <div className="min-w-[12rem] flex-1 space-y-1">
          <Label htmlFor={`reason-${walletId}`}>Note</Label>
          <Input
            id={`reason-${walletId}`}
            name="reason"
            placeholder={`e.g. Pilot top-up for ${learnerName}`}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Add funds'}
        </Button>
      </div>
    </form>
  );
}
