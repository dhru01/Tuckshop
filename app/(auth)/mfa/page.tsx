import type { Metadata } from 'next';
import { Suspense } from 'react';

import { MfaForm } from '@/components/auth/mfa-form';

export const metadata: Metadata = { title: 'Multi-factor authentication' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MfaForm />
    </Suspense>
  );
}
