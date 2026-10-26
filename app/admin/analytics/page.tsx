import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Analytics' };

export default function Page() {
  return <PhasePlaceholder title="Analytics" description="Growth and usage" phase={10} />;
}
