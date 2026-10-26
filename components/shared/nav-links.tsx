'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { INTERFACES, type InterfaceKey } from '@/lib/navigation';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string, basePath: string) {
  if (href === basePath) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Vertical sidebar navigation. */
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
    <nav aria-label={`${iface.label} navigation`} className="flex flex-col gap-1">
      {iface.nav.map((item) => {
        const active = isActive(pathname, item.href, iface.basePath);
        return (
          <Link
            key={item.href}
            href={item.href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom tab bar (parent portal). Shows the first five items. */
export function BottomTabs({ interfaceKey }: { interfaceKey: InterfaceKey }) {
  const pathname = usePathname();
  const iface = INTERFACES[interfaceKey];
  const items = iface.nav.slice(0, 5);

  return (
    <nav
      aria-label={`${iface.label} tabs`}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href, iface.basePath);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
