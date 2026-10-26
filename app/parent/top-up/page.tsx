import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Top up' };

export default function Page() {
  return <PhasePlaceholder title="Top up" description="Add money to a wallet" phase={9} />;
}
