import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Audit logs' };

export default function Page() {
  return <PhasePlaceholder title="Audit logs" description="Sensitive action history" phase={10} />;
}
