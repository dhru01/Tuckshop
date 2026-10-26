import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return <PhasePlaceholder title="Settings" description="School configuration" phase={3} />;
}
