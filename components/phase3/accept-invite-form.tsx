'use client';

import { useActionState } from 'react';

import { acceptInviteFormAction, type ActionState } from '@/app/actions/phase3';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';

const initial: ActionState = {};

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInviteFormAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Linking…' : 'Accept invitation'}
      </Button>
    </form>
  );
}
