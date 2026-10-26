import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
  descriptionClassName,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Small label above the title (e.g. the section or school name). */
  eyebrow?: string;
  className?: string;
  descriptionClassName?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-balance md:text-3xl">
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              'max-w-prose text-sm text-pretty text-muted-foreground md:text-base',
              descriptionClassName,
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
