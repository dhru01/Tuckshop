'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { INTERFACES } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/** POS section navigation: large pill targets (≥ 48 px) with a clear active state. */
export function PosNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="POS navigation"
      className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
    >
      {INTERFACES.pos.nav.map((item) => {
        const active =
          item.href === '/pos'
            ? pathname === '/pos'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="size-[1.1rem]" aria-hidden="true" />
            <span className={cn(!active && 'hidden lg:inline')}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
