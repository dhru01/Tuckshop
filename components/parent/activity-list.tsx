import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/states';
import type { ParentActivityItem } from '@/lib/parent/types';
import { formatRand } from '@/lib/wallets/money';

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ActivityList({ items }: { items: ParentActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Purchases and top-ups will appear here once the tuck shop and payments are live."
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border border-border bg-background">
      {items.map((item) => (
        <li key={`${item.kind}:${item.id}`} className="flex items-center justify-between gap-4 p-4 text-sm">
          <div className="min-w-0">
            <p className="font-medium">{item.label}</p>
            <p className="text-muted-foreground">{item.learnerName}</p>
            <p className="text-xs text-muted-foreground">{formatWhen(item.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="font-medium tabular-nums">
              {item.kind === 'purchase' ? '-' : '+'}
              {formatRand(item.amountCents)}
            </p>
            {item.kind === 'top_up' && item.status !== 'succeeded' ? (
              <StatusBadge tone="warning">{item.status}</StatusBadge>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
