import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { RoleContext } from '@/lib/auth/context-types';

export function ParentChildrenEmpty({
  contexts,
  accountEmail,
}: {
  contexts: RoleContext[];
  accountEmail: string;
}) {
  const isSuperAdmin = contexts.some((c) => c.role === 'super_admin');
  const schoolAdmin = contexts.find((c) => c.role === 'school_admin');

  return (
    <li className="space-y-4 p-4 text-sm text-muted-foreground">
      <p>
        Parents cannot add or import children here. In your <strong className="font-medium text-foreground">school workspace</strong>,
        use <strong className="font-medium text-foreground">Learners</strong> to add one child or import a CSV roster, then open the caregiver invite link.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        {isSuperAdmin ? (
          <li>
            <Link href="/admin/schools" className="text-foreground underline">
              Onboard your pilot school
            </Link>{' '}
            (use <span className="text-foreground">{accountEmail}</span> as school admin email).
          </li>
        ) : (
          <li>Ask a platform admin to onboard your school (see docs/PILOT_WALKTHROUGH.md).</li>
        )}
        <li>
          Open{' '}
          <Link href="/select-context" className="text-foreground underline">
            Switch role
          </Link>{' '}
          → choose <strong className="font-medium text-foreground">School admin</strong>.
        </li>
        <li>
          <Link href="/school/learners" className="text-foreground underline">
            School → Learners
          </Link>{' '}
          → add manually or import CSV (student + caregiver email).
        </li>
        <li>Open the invite link as the caregiver (same email as in the file).</li>
        <li>Return here as <strong className="font-medium text-foreground">Parent</strong> to see the child.</li>
      </ol>
      {schoolAdmin ? (
        <Button asChild size="sm">
          <Link href="/school/learners">Add learner (school admin)</Link>
        </Button>
      ) : isSuperAdmin ? (
        <Button asChild size="sm">
          <Link href="/admin/schools">Set up school first</Link>
        </Button>
      ) : null}
    </li>
  );
}
