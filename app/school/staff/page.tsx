import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Staff' };

export default function Page() {
  return <PhasePlaceholder title="Staff" description="Cashiers and administrators" phase={3} />;
}
