'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';

/**
 * Last-resort error boundary. Shows a generic message and an opaque reference only; the real
 * error is never rendered (it may contain internal details). Server-side logging/Sentry captures it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Phase 12: forward to error monitoring with PII scrubbing.
    console.error('Unhandled UI error', { digest: error.digest });
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md items-center p-4">
      <ErrorState reference={error.digest} action={<Button onClick={reset}>Try again</Button>} />
    </main>
  );
}
