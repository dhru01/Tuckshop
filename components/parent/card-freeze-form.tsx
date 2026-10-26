'use client';

import { useActionState } from 'react';

import { toggleCardFreezeAction, type ParentActionState } from '@/app/actions/parent-portal';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import type { GuardianChild } from '@/lib/parent/types';

const initial: ParentActionState = {};

export function CardFreezeForm({ child }: { child: GuardianChild }) {
  const [state, action, pending] = useActionState(toggleCardFreezeAction, initial);

  if (!child.cardId) {
    return <p className="text-sm text-muted-foreground">No NFC card on file for this child.</p>;
  }

  if (!child.canManageControls) {
    return (
      <p className="text-sm text-muted-foreground">Contact the school to freeze or replace this card.</p>
    );
  }

  const frozen = child.cardStatus === 'frozen';
  const canFreeze = child.cardStatus === 'active';
  const canUnfreeze = frozen;

  return (
    <form action={action} className="space-y-2">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <input type="hidden" name="cardId" value={child.cardId} />
      <input type="hidden" name="frozen" value={canFreeze ? 'true' : 'false'} />
      {(canFreeze || canUnfreeze) ? (
        <Button type="submit" variant={canFreeze ? 'destructive' : 'default'} size="sm" disabled={pending}>
          {pending ? 'Updating…' : canFreeze ? 'Freeze card' : 'Unfreeze card'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Card status: {child.cardStatus}</p>
      )}
    </form>
  );
}
