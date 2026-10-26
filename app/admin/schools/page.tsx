import type { Metadata } from 'next';

import { OnboardSchoolForm } from '@/components/phase3/onboard-school-form';
import { PageHeader } from '@/components/shared/page-header';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Schools' };

export default async function Page() {
  await requireActorForInterface('admin');
  const supabase = await createSupabaseServerClient();
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, school_code, status, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader title="Schools" description="Onboard pilot schools and manage status." />
      <OnboardSchoolForm />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">All schools</h2>
        <ul className="divide-y rounded-md border border-border bg-background">
          {(schools ?? []).length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No schools yet.</li>
          ) : (
            (schools ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.school_code}</span>
                <span className="capitalize">{s.status}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
