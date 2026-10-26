import type { Metadata } from 'next';

import { InviteParentForm } from '@/components/phase3/invite-parent-form';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { approveGuardianFormAction } from '@/app/actions/phase3';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Parents' };

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const supabase = await createSupabaseServerClient();

  const { data: learners } = schoolId
    ? await supabase
        .from('learners')
        .select('id, first_name, last_name, grade')
        .eq('school_id', schoolId)
        .eq('status', 'active')
    : { data: [] };

  const { data: pending } = schoolId
    ? await supabase
        .from('parent_learner_relationships')
        .select('id, status, parent_id, learner_id, profiles ( first_name, last_name, email )')
        .eq('school_id', schoolId)
        .eq('status', 'pending_approval')
    : { data: [] };

  return (
    <div className="space-y-8">
      <PageHeader title="Parents" description="Invite guardians and approve links." />
      {schoolId && learners && learners.length > 0 ? (
        <InviteParentForm learners={learners} />
      ) : (
        <p className="text-sm text-muted-foreground">Add a learner first.</p>
      )}
      {(pending ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Pending approval</h2>
          <ul className="divide-y rounded-md border border-border bg-background">
            {(pending ?? []).map((row) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
              return (
                <li key={row.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <span>{profile?.email ?? 'Parent'}</span>
                  <form action={approveGuardianFormAction}>
                    <input type="hidden" name="relationshipId" value={row.id} />
                    <Button type="submit" size="sm" variant="outline">Approve</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
