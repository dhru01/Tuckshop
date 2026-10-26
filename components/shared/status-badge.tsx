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
  success: { className: 'bg-success-soft text-success border-success/25', icon: CheckCircle2 },
  warning: { className: 'bg-warning-soft text-warning border-warning/30', icon: AlertTriangle },
  danger: { className: 'bg-danger-soft text-danger border-danger/25', icon: XCircle },
  info: { className: 'bg-info-soft text-info border-info/25', icon: Info },
  neutral: { className: 'bg-muted text-muted-foreground border-border', icon: CircleDashed },
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
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClass,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}
