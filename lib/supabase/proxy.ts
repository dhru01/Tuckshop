import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session cookies for a request (called from proxy.ts).
 *
 * This is for session *maintenance* and an optimistic "is there a session at all" check only.
 * It is NOT an authorisation boundary: layouts, Server Actions, Route Handlers and the database
 * (RLS + functions) each re-verify access independently (docs/ARCHITECTURE.md §6–7).
 */
export async function updateSession(
  request: NextRequest,
  url: string,
  publishableKey: string,
): Promise<{ response: NextResponse; hasSession: boolean }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() validates the JWT signature and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  return { response, hasSession: Boolean(data?.claims?.sub) };
}
