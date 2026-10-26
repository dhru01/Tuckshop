'use client';

import { useState, useTransition } from 'react';

import { schoolSetCardStatusAction } from '@/app/actions/cards';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { StatusBadge, type StatusTone } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type SchoolCardRowProps = {
  cardId: string;
  status: string;
  learnerName: string;
};

function cardStatusPresentation(status: string): { label: string; tone: StatusTone; glow?: boolean } {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success', glow: true };
    case 'frozen':
      return { label: 'Frozen', tone: 'warning' };
    case 'lost':
      return { label: 'Lost', tone: 'danger' };
    case 'stolen':
      return { label: 'Stolen', tone: 'danger' };
    case 'deactivated':
      return { label: 'Deactivated', tone: 'neutral' };
    case 'replaced':
      return { label: 'Replaced', tone: 'neutral' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

export function SchoolCardRow({ cardId, status, learnerName }: SchoolCardRowProps) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const { label, tone, glow } = cardStatusPresentation(status);

  const runStatus = (newStatus: string, defaultReason: string) => {
    setMessage(undefined);
    setError(undefined);
    start(async () => {
      const result = await schoolSetCardStatusAction(cardId, newStatus, defaultReason);
      if (result.error) setError(result.error);
      else setMessage(result.success);
    });
  };

  const terminal = ['deactivated', 'replaced'].includes(status);
  const restorable = status === 'lost' || status === 'stolen';

  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{learnerName}</span>
        <StatusBadge
          tone={tone}
          className={cn(
            glow &&
              'shadow-[0_0_0_1px_oklch(0.5_0.14_152_/_0.35),0_0_14px_oklch(0.55_0.16_152_/_0.35)] ring-success/40',
          )}
        >
          {label}
        </StatusBadge>
      </div>
      <FormError message={error} />
      <FormSuccess message={message} />
      {restorable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => runStatus('active', 'Restored after mistaken report')}
          >
            Restore card
          </Button>
        </div>
      ) : null}
      {!terminal && !restorable ? (
        <div className="flex flex-wrap gap-2">
          {status === 'active' ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runStatus('frozen', 'Admin freeze')}>
              Freeze
            </Button>
          ) : null}
          {status === 'frozen' ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runStatus('active', 'Unfrozen by admin')}>
              Unfreeze
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={pending}>
                Mark lost / stolen
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => runStatus('lost', 'Reported lost')}>
                Lost
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => runStatus('stolen', 'Reported stolen')}>
                Stolen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </li>
  );
}
