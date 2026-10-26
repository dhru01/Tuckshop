import Link from 'next/link';

import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { GuardianChild } from '@/lib/parent/types';
import { formatRand } from '@/lib/wallets/money';

export function ChildSummaryCard({ child }: { child: GuardianChild }) {
  const cardTone =
    child.cardStatus === 'frozen'
      ? 'warning'
      : child.cardStatus === 'active'
        ? 'success'
        : 'neutral';

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{child.firstName} {child.lastName}</p>
            <p className="text-sm text-muted-foreground">{child.grade} · {child.schoolName}</p>
          </div>
          <p className="text-lg font-semibold tabular-nums">{formatRand(child.balanceCents)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={child.walletStatus === 'frozen' ? 'warning' : 'neutral'}>
            Wallet {child.walletStatus ?? '—'}
          </StatusBadge>
          {child.cardStatus ? (
            <StatusBadge tone={cardTone}>Card {child.cardStatus}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">No card</StatusBadge>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/parent/children/${child.learnerId}`}>View details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
