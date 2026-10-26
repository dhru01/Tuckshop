'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { selectContextAction, type AuthActionState } from '@/app/actions/auth';
import type { RoleContext } from '@/lib/auth/context-types';
import { contextLabel, defaultDashboardPath } from '@/lib/auth/roles';
import { AuthCard } from '@/components/auth/auth-card';
import { FormError } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';

const initial: AuthActionState = {};

export function ContextPicker({
  contexts,
  next,
}: {
  contexts: RoleContext[];
  next?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(selectContextAction, initial);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state.redirectTo, router]);

  return (
    <AuthCard
      title="Choose how to continue"
      description="You have more than one role. Pick the workspace you want to open."
    >
      <FormError message={state.error} />
      <ul className="flex flex-col gap-2">
        {contexts.map((ctx) => (
          <li key={`${ctx.role}:${ctx.schoolId ?? ''}`}>
            <form action={action}>
              <input type="hidden" name="role" value={ctx.role} />
              {ctx.schoolId ? <input type="hidden" name="schoolId" value={ctx.schoolId} /> : null}
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <Button
                type="submit"
                variant="outline"
                className="h-auto w-full justify-between py-3"
                disabled={pending}
              >
                <span>{contextLabel(ctx.role, ctx.schoolName)}</span>
                <span className="text-xs text-muted-foreground">
                  {defaultDashboardPath(ctx.role)}
                </span>
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </AuthCard>
  );
}
