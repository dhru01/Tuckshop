'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { PilotFundForm } from '@/components/school/pilot-fund-form';
import { formatLearnerGrade } from '@/lib/school/grade-display';
import { cn } from '@/lib/utils';

export function LearnerListRow({
  learnerId,
  firstName,
  lastName,
  grade,
  balanceLabel,
  walletId,
}: {
  learnerId: string;
  firstName: string;
  lastName: string;
  grade: string;
  balanceLabel: string;
  walletId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const fullName = `${firstName} ${lastName}`;

  return (
    <li className="text-sm">
      <button
        type="button"
        className={cn(
          'flex w-full flex-wrap items-baseline justify-between gap-2 p-4 text-left transition-colors',
          'hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          open && 'bg-muted/30',
        )}
        aria-expanded={open}
        aria-controls={`learner-panel-${learnerId}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-semibold">
          {fullName}
          <span className="font-semibold text-muted-foreground"> · {formatLearnerGrade(grade)}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="num font-semibold tabular-nums">{balanceLabel}</span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
      </button>
      {open ? (
        <div
          id={`learner-panel-${learnerId}`}
          className="border-t border-border bg-muted/20 px-4 pb-4"
        >
          {walletId ? (
            <PilotFundForm walletId={walletId} learnerName={fullName} />
          ) : (
            <p className="pt-3 text-sm text-muted-foreground">No wallet found for this learner.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
