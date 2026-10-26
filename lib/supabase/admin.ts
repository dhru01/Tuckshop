import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/lib/env/public';
import { serverEnv } from '@/lib/env/server';

/**
 * SERVICE-ROLE client. BYPASSES ROW LEVEL SECURITY.
 *
 * Rules (docs/SECURITY.md §6) – enforced by an ESLint `no-restricted-imports` rule:
 *  - Import only from the allow-listed modules (services/*, app/api/webhooks/**, app/api/cron/**).
 *  - Use it to call named, audited RPC functions; do not run ad-hoc table queries with it.
 *  - Never return its results to the client without re-checking the acting user's authorisation.
 *  - Never log the key or request/response bodies that may contain credentials.
 */
export function createSupabaseAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
