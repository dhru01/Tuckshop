import { AppShell } from '@/components/shared/app-shell';
import { requireInterface } from '@/lib/auth/guard';
import { resolveShellWorkspace } from '@/lib/auth/shell-workspace';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const access = await requireInterface('parent');
  const workspace = await resolveShellWorkspace(access, 'parent');
  return (
    <AppShell interfaceKey="parent" previewMode={access.kind === 'preview'} workspace={workspace}>
      {children}
    </AppShell>
  );
}
