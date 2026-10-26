import { NextResponse, type NextRequest } from 'next/server';

import { isUiPreviewEnabled } from '@/lib/auth/preview';
import { PROTECTED_PREFIXES } from '@/lib/navigation';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Proxy (formerly "middleware" – renamed in Next.js 16).
 *
 * Responsibilities (and ONLY these):
 *  1. Refresh the Supabase session cookie.
 *  2. Optimistically redirect anonymous visitors away from protected interfaces.
 *
 * It is NOT an authorisation boundary. Server Functions are separate POST requests that a matcher
 * can skip, so every layout / Server Action / Route Handler re-verifies access, and the database
 * enforces it again (docs/ARCHITECTURE.md §6–7, docs/SECURITY.md §4).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let response = NextResponse.next({ request });
  let hasSession = false;

  // Supabase is always configured in real deployments (validated at boot). The guard exists only
  // so CI builds / UI preview without a project do not crash.
  if (url && key) {
    ({ response, hasSession } = await updateSession(request, url, key));
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession && !isUiPreviewEnabled()) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and server-to-server endpoints (webhooks use signatures, cron uses a secret).
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
