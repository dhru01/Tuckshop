import { parsePublicEnv, type PublicEnv } from './schema';

let cached: PublicEnv | undefined;

/**
 * Browser-safe configuration.
 *
 * NOTE: Next.js only inlines `process.env.NEXT_PUBLIC_*` when the variable is referenced
 * literally, so each one is listed explicitly below (do not iterate over process.env).
 */
export function publicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}

/** True when Supabase public config is present. Used by proxy.ts to degrade safely in preview/CI. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
