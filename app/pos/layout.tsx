import { PosShell } from '@/components/pos/pos-shell';
import { requireInterface } from '@/lib/auth/guard';

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const access = await requireInterface('pos');
  return <PosShell previewMode={access.kind === 'preview'}>{children}</PosShell>;
}
