import type { Metadata } from 'next';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { requireActorForInterface } from '@/lib/auth/require-actor';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifications' };

export default async function Page() {
  const access = await requireActorForInterface('parent');
  const supabase = await createSupabaseServerClient();
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, category, read_at, created_at')
    .eq('user_id', access.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="In-app alerts. Email and SMS wiring arrives in a later phase."
      />
      {(notifications ?? []).length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <ul className="divide-y rounded-md border border-border bg-background">
          {(notifications ?? []).map((n) => (
            <li key={n.id} className={`p-4 text-sm ${n.read_at ? 'opacity-80' : ''}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{n.category}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
