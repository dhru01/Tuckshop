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
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2 border-t border-border pt-2">
      <input type="hidden" name="walletId" value={walletId} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="space-y-1">
        <Label htmlFor={`amt-${walletId}`} className="text-xs">Pilot credit (R)</Label>
        <Input id={`amt-${walletId}`} name="amount" placeholder="50" className="h-8 w-24" />
      </div>
      <div className="min-w-[8rem] flex-1 space-y-1">
        <Label htmlFor={`reason-${walletId}`} className="text-xs">Reason</Label>
        <Input
          id={`reason-${walletId}`}
          name="reason"
          placeholder={`Pilot for ${learnerName}`}
          className="h-8"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? '…' : 'Add funds'}
      </Button>
    </form>
  );
}
