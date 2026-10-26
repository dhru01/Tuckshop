'use client';

import { Menu } from 'lucide-react';
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
  name: 'Tuckshop',
  hint: '',
  initial: 'T',
};

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
    <div className="flex min-h-dvh bg-muted/30">
      <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background p-4 md:flex">
        <Brand />
        <div className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {iface.label}
          </p>
          <SidebarNav interfaceKey={interfaceKey} />
        </div>
        <div className="mt-4 shrink-0 border-t border-border pt-4">
          <WorkspaceProfile workspace={shellWorkspace} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
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
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <Brand />
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col px-4">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <SidebarNav interfaceKey={interfaceKey} onNavigate={() => setOpen(false)} />
                  </div>
                  <div className="shrink-0 border-t border-border py-4">
                    <WorkspaceProfile workspace={shellWorkspace} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Brand compact className="md:hidden" />
            <span className="text-sm font-medium md:hidden">{iface.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {previewMode ? (
              <StatusBadge tone="warning">UI preview – not signed in</StatusBadge>
            ) : (
              <SignOutButton />
            )}
          </div>
        </header>

        <main id="main" className={`flex-1 p-4 md:p-8 ${mobileTabs ? 'pb-24 md:pb-8' : ''}`}>
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {mobileTabs && <BottomTabs interfaceKey={interfaceKey} />}
    </div>
  );
}
