'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { INTERFACES, type InterfaceKey } from '@/lib/navigation';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string, basePath: string) {
  if (href === basePath) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical sidebar navigation (rendered on the dark ink sidebar). */
export function SidebarNav({
  interfaceKey,
  onNavigate,
}: {
  interfaceKey: InterfaceKey;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const iface = INTERFACES[interfaceKey];

  return (
    <nav aria-label={`${iface.label} navigation`} className="flex flex-col gap-0.5">
      {iface.nav.map((item) => {
        const active = isActive(pathname, item.href, iface.basePath);
        return (
          <Link
            key={item.href}
            href={item.href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150',
              'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all',
                active ? 'opacity-100' : 'h-0 opacity-0',
              )}
            />
            <item.icon
              className={cn(
                'size-[1.15rem] shrink-0 transition-colors',
                active ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground',
              )}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Routes shown as primary tabs on mobile for each interface (all others live under "More"). */
const MOBILE_TAB_HREFS: Partial<Record<InterfaceKey, readonly string[]>> = {
  parent: [
    '/parent/dashboard',
    '/parent/wallet',
    '/parent/transactions',
    '/parent/children',
  ],
};

/** Mobile bottom tab bar (parent portal). Primary tabs + a "More" button that opens the full menu. */
export function BottomTabs({
  interfaceKey,
  onMore,
}: {
  interfaceKey: InterfaceKey;
  onMore: () => void;
}) {
  const pathname = usePathname();
  const iface = INTERFACES[interfaceKey];
  const hrefs = MOBILE_TAB_HREFS[interfaceKey];
  const items = hrefs
    ? iface.nav.filter((n) => hrefs.includes(n.href))
    : iface.nav.slice(0, 4);
  const moreActive = !items.some((n) => isActive(pathname, n.href, iface.basePath));

  return (
    <nav
      aria-label={`${iface.label} tabs`}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-lift backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5 px-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href, iface.basePath);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-brand-soft',
                  )}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className={cn(
              'flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition-colors',
              moreActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                moreActive && 'bg-brand-soft',
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </span>
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
