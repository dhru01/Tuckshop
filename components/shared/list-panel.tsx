import { cn } from '@/lib/utils';

/**
 * Elevated container for lists of records (learners, cards, products, activity…).
 * Replaces the old bordered `ul.divide-y` boxes. Rows are `ListRow`.
 */
export function ListPanel({
  children,
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'divide-y divide-border overflow-hidden rounded-2xl bg-card text-sm shadow-card ring-1 ring-border',
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

export function ListRow({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      className={cn('px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5', className)}
      {...props}
    >
      {children}
    </li>
  );
}

/** Row shown inside a `ListPanel` when there is nothing to list. */
export function ListEmpty({ children }: { children: React.ReactNode }) {
  return <li className="px-5 py-10 text-center text-sm text-muted-foreground">{children}</li>;
}
