import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type StatTone = 'brand' | 'info' | 'warning' | 'success' | 'neutral';

const ICON_TONES: Record<StatTone, string> = {
  brand: 'bg-brand-soft text-primary',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group relative flex items-start justify-between gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-card ring-1 ring-border transition-shadow hover:shadow-lift',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-heading num truncate text-3xl font-bold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <span
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
            ICON_TONES[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
