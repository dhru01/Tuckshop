import { AppShell } from '@/components/shared/app-shell';
import { resolveShellWorkspace } from '@/lib/auth/shell-workspace';
import { requireInterface } from '@/lib/auth/guard';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requireInterface('admin');
  const workspace = await resolveShellWorkspace(access, 'admin');
  return (
    <AppShell interfaceKey="admin" previewMode={access.kind === 'preview'} workspace={workspace}>
      {children}
    </AppShell>
  );
}
