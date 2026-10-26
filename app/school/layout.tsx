import { AppShell } from '@/components/shared/app-shell';
import { requireInterface } from '@/lib/auth/guard';
import { resolveShellWorkspace } from '@/lib/auth/shell-workspace';

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const access = await requireInterface('school');
  const workspace = await resolveShellWorkspace(access, 'school');
  return (
    <AppShell interfaceKey="school" previewMode={access.kind === 'preview'} workspace={workspace}>
      {children}
    </AppShell>
  );
}
