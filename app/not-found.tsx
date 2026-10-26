import { SearchX } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/shared/states';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md items-center p-4">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page you are looking for does not exist or you may not have access to it."
        action={
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        }
      />
    </main>
  );
}
