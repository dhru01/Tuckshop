import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'POS settings' };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Register this browser as a POS device when you open a shift. Hardware reader setup arrives in Phase 8."
      />
      <p className="max-w-prose text-sm text-muted-foreground">
        Use the Shift page to name this terminal and open a shift. In development, you can paste a pilot
        card UID at checkout (same format as School → NFC cards).
      </p>
    </div>
  );
}
