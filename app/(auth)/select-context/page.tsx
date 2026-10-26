import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ContextPicker } from '@/components/auth/context-picker';
import { loadRoleContexts } from '@/lib/auth/load-contexts';
import { resolvePostLoginPath } from '@/lib/auth/post-login';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Choose workspace' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const contexts = await loadRoleContexts(supabase, user.id);
  if (contexts.length === 0) redirect('/no-access?reason=membership');
  if (contexts.length === 1) {
    redirect(resolvePostLoginPath(contexts, next));
  }

  return <ContextPicker contexts={contexts} next={next} />;
}
