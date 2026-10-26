import { NextResponse } from 'next/server';

import { resolvePostLoginPath } from '@/lib/auth/post-login';
import { loadRoleContexts } from '@/lib/auth/load-contexts';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * OAuth / email-confirmation / password-recovery code exchange.
 * Configure Supabase Auth redirect URLs to include `${APP_URL}/auth/callback`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  if (!user.email_confirmed_at) {
    return NextResponse.redirect(`${origin}/verify-email`);
  }

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const contexts = await loadRoleContexts(supabase, user.id);
  const path = resolvePostLoginPath(contexts);
  return NextResponse.redirect(`${origin}${path}`);
}
