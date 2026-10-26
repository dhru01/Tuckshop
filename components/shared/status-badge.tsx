import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<StatusTone, { className: string; icon: LucideIcon }> = {
  success: { className: 'bg-success-soft text-success ring-success/20', icon: CheckCircle2 },
  warning: { className: 'bg-warning-soft text-warning ring-warning/25', icon: AlertTriangle },
  danger: { className: 'bg-danger-soft text-danger ring-danger/20', icon: XCircle },
  info: { className: 'bg-info-soft text-info ring-info/20', icon: Info },
  neutral: { className: 'bg-muted text-muted-foreground ring-border', icon: CircleDashed },
};

/**
 * Status pill. Always shows an icon AND text so meaning never depends on colour alone
 * (WCAG 1.4.1).
 */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const { className: toneClass, icon: Icon } = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap ring-1 ring-inset',
        toneClass,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}
