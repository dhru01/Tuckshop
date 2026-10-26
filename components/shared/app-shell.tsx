'use client';

import { ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Brand } from '@/components/shared/brand';
import { SidebarNav, BottomTabs } from '@/components/shared/nav-links';
import { WorkspaceProfile } from '@/components/shared/workspace-profile';
import type { ShellWorkspace } from '@/lib/auth/shell-workspace';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SignOutButton } from '@/components/auth/user-menu';
import { INTERFACES, type InterfaceKey } from '@/lib/navigation';

const FALLBACK_WORKSPACE: ShellWorkspace = {
  name: 'FirstByte Tuckshop',
  hint: '',
  initial: 'F',
};

/** Breadcrumb trail derived from the interface config + current path (labels only, no data). */
function Breadcrumbs({ interfaceKey }: { interfaceKey: InterfaceKey }) {
  const pathname = usePathname();
  const iface = INTERFACES[interfaceKey];
  const current = iface.nav.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  );
  const nested = current ? pathname !== current.href : false;

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
      <Link
        href={iface.nav[0]?.href ?? iface.basePath}
        className="font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {iface.label}
      </Link>
      {current && (
        <>
          <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
          {nested ? (
            <Link
              href={current.href}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {current.label}
            </Link>
          ) : (
            <span aria-current="page" className="truncate font-semibold text-foreground">
              {current.label}
            </span>
          )}
          {nested && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
              <span aria-current="page" className="font-semibold text-foreground">
                Details
              </span>
            </>
          )}
        </>
      )}
    </nav>
  );
}

/**
 * Shared shell for the desktop-first interfaces (school admin, platform admin) and the
 * mobile-first parent portal (which adds a bottom tab bar on small screens).
 */
export function AppShell({
  interfaceKey,
  previewMode,
  workspace,
  children,
}: {
  interfaceKey: InterfaceKey;
  previewMode: boolean;
  workspace?: ShellWorkspace;
  children: React.ReactNode;
}) {
  const shellWorkspace = workspace ?? FALLBACK_WORKSPACE;
  const [open, setOpen] = useState(false);
  const iface = INTERFACES[interfaceKey];
  const mobileTabs = interfaceKey === 'parent';

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="hidden h-dvh w-72 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:sticky md:top-0 md:flex">
        <Link
          href={iface.nav[0]?.href ?? iface.basePath}
          aria-label={`FirstByte Tuckshop – ${iface.label}`}
          className="rounded-xl px-2 py-1 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <Brand tone="light" />
        </Link>
        <div className="mt-8 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          <p className="px-3 text-[0.7rem] font-semibold tracking-[0.16em] text-sidebar-muted uppercase">
            {iface.label}
          </p>
          <SidebarNav interfaceKey={interfaceKey} />
        </div>
        <div className="mt-4 shrink-0 border-t border-sidebar-border pt-4">
          <WorkspaceProfile workspace={shellWorkspace} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-canvas/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              {!mobileTabs && (
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
              )}
              <SheetContent
                side="left"
                className="w-80 border-sidebar-border bg-sidebar text-sidebar-foreground"
              >
                <SheetHeader>
                  <SheetTitle>
                    <Brand tone="light" />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col px-4 pb-4">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <SidebarNav interfaceKey={interfaceKey} onNavigate={() => setOpen(false)} />
                  </div>
                  <div className="shrink-0 border-t border-sidebar-border pt-4">
                    <WorkspaceProfile workspace={shellWorkspace} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Brand compact className="md:hidden" />
            <span className="font-heading text-sm font-semibold md:hidden">{iface.label}</span>
            <Breadcrumbs interfaceKey={interfaceKey} />
          </div>
          <div className="flex items-center gap-2">
            {previewMode ? (
              <StatusBadge tone="warning">UI preview – not signed in</StatusBadge>
            ) : (
              <SignOutButton />
            )}
          </div>
        </header>

        <main
          id="main"
          className={`flex-1 p-4 md:p-8 ${mobileTabs ? 'pb-28 md:pb-8' : ''}`}
        >
          <div className="page-enter mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {mobileTabs && <BottomTabs interfaceKey={interfaceKey} onMore={() => setOpen(true)} />}
    </div>
  );
}
