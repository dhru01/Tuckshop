import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { publicEnv } from '@/lib/env/public';

/**
 * Supabase client bound to the CURRENT USER's session (cookies). All queries run under the
 * user's JWT, so Row Level Security applies. This is the default client for reading data.
 *
 * For identity decisions use `supabase.auth.getUser()` (validated by the Auth server);
 * never trust an unverified session object read from cookies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
