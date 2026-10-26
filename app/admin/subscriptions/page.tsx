import type { Metadata } from 'next';

import { PhasePlaceholder } from '@/components/shared/phase-placeholder';

export const metadata: Metadata = { title: 'Subscriptions' };

export default function Page() {
  return <PhasePlaceholder title="Subscriptions" description="Plans and billing" phase={10} />;
}
