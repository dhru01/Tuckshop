import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Reports' };

export default function Page() {
  return <PhasePlaceholder title="Reports" description="Reports and CSV export" phase={10} />;
}
