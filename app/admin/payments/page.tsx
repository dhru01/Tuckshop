import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Payments' };

export default function Page() {
  return <PhasePlaceholder title="Payments" description="Payment health and failures" phase={10} />;
}
