import type { Metadata } from 'next';

import { RegisterCardForm } from '@/components/phase3/register-card-form';
import { SchoolCardRow } from '@/components/school/school-card-row';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { enablePilotNfcFormAction } from '@/app/actions/phase3';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'NFC cards' };

export default async function Page() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  const supabase = await createSupabaseServerClient();

  const { data: settings } = schoolId
    ? await supabase
        .from('school_settings')
        .select('allow_uid_only_cards')
        .eq('school_id', schoolId)
        .maybeSingle()
    : { data: null };

  const { data: learners } = schoolId
    ? await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_ref')
        .eq('school_id', schoolId)
        .eq('status', 'active')
    : { data: [] };

  const { data: cards } = schoolId
    ? await supabase
        .from('nfc_cards')
        .select('id, card_status, credential_reference, learner_id, learners ( first_name, last_name )')
        .eq('school_id', schoolId)
    : { data: [] };

  return (
    <div className="space-y-8">
      <PageHeader
        title="NFC cards"
        description="Register cards, manage lost/stolen/freeze, and replace pilot UID cards. Secure SDM verification is required before production."
      />
      {!settings?.allow_uid_only_cards ? (
        <form action={enablePilotNfcFormAction}>
          <Button type="submit" variant="outline">Enable pilot UID cards</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Pilot UID mode is on for this school.</p>
      )}
      {settings?.allow_uid_only_cards && learners && learners.length > 0 ? (
        <RegisterCardForm learners={learners} />
      ) : null}
      <ul className="divide-y rounded-md border border-border bg-background text-sm">
        {(cards ?? []).length === 0 ? (
          <li className="p-4 text-muted-foreground">No cards registered.</li>
        ) : (
          (cards ?? []).map((c) => {
            const learner = Array.isArray(c.learners) ? c.learners[0] : c.learners;
            return (
              <SchoolCardRow
                key={c.id}
                cardId={c.id}
                status={c.card_status}
                credentialReference={c.credential_reference}
                learnerName={`${learner?.first_name ?? ''} ${learner?.last_name ?? ''}`.trim()}
                allowUidPilot={Boolean(settings?.allow_uid_only_cards)}
              />
            );
          })
        )}
      </ul>
    </div>
  );
}
