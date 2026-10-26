import type { Metadata } from 'next';

import { PosShiftPanel } from '@/components/pos/pos-shift-panel';
import { PageHeader } from '@/components/shared/page-header';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Shift' };

export default async function Page() {
  const access = await requireActorForInterface('pos');
  const schoolId = access.active.schoolId;
  const actor = actorId(access);
  const supabase = await createSupabaseServerClient();

  const { data: openShift } = schoolId
    ? await supabase
        .from('cashier_shifts')
        .select('id')
        .eq('school_id', schoolId)
        .eq('cashier_id', actor)
        .eq('status', 'open')
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <PageHeader title="Shift" description="Open your shift before taking payments." />
      <PosShiftPanel hasOpenShift={Boolean(openShift)} />
    </div>
  );
}
