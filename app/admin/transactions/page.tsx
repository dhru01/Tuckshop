import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Transactions' };

export default function Page() {
  return (
    <PhasePlaceholder title="Transactions" description="Platform transaction metrics" phase={10} />
  );
}
