'use client';

import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from '@/lib/env/public';

/**
 * Browser Supabase client. Uses ONLY the publishable key; every query is limited by RLS.
 * The browser must never call money-moving functions (EXECUTE is revoked for `authenticated`).
 */
export function createSupabaseBrowserClient() {
  const env = publicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
