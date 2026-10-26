import Link from 'next/link';

import { Brand } from '@/components/shared/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link href="/" aria-label="Tuckshop home">
        <Brand />
      </Link>
      <main id="main" className="w-full max-w-md">
        {children}
      </main>
    </div>
  );
}
