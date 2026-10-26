import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Users' };

export default function Page() {
  return <PhasePlaceholder title="Users" description="Platform users" phase={10} />;
}
