import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return <PhasePlaceholder title="Dashboard" description="Platform overview" phase={10} />;
}
