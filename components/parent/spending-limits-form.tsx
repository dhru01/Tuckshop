'use client';

import { useActionState } from 'react';

import {
  updateSpendingLimitsAction,
  type ParentActionState,
} from '@/app/actions/parent-portal';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GuardianChild } from '@/lib/parent/types';
import { formatRand } from '@/lib/wallets/money';

const initial: ParentActionState = {};

function limitDisplay(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2);
}

export function SpendingLimitsForm({ child }: { child: GuardianChild }) {
  const [state, action, pending] = useActionState(updateSpendingLimitsAction, initial);

  if (!child.canManageControls) {
    return (
      <p className="text-sm text-muted-foreground">
        Your school has not allowed you to change spending limits for this child.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-md border border-border p-4">
      <p className="text-sm font-medium">{child.firstName} {child.lastName}</p>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <input type="hidden" name="learnerId" value={child.learnerId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`daily-${child.learnerId}`}>Daily limit (R)</Label>
          <Input
            id={`daily-${child.learnerId}`}
            name="dailyLimit"
            placeholder="None"
            defaultValue={limitDisplay(child.dailyLimitCents)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`weekly-${child.learnerId}`}>Weekly limit (R)</Label>
          <Input
            id={`weekly-${child.learnerId}`}
            name="weeklyLimit"
            placeholder="None"
            defaultValue={limitDisplay(child.weeklyLimitCents)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave blank or type &quot;none&quot; for no limit. Current balance:{' '}
        {formatRand(child.balanceCents)}. Limits apply at checkout (Phase 7).
      </p>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save limits'}
      </Button>
    </form>
  );
}
