import type { Metadata } from 'next';

import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Choose new password' };

export default function Page() {
  return <ResetPasswordForm />;
}
