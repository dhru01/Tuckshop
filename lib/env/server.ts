import 'server-only';

import { parsePublicEnv, parseServerEnv, type ServerEnv } from './schema';

let cached: ServerEnv | undefined;

/** Server-only configuration (includes secrets). Never import from client components. */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** True when CI/test tooling explicitly opted out of validation. */
export function envValidationSkipped(): boolean {
  return process.env.SKIP_ENV_VALIDATION === '1';
}

/**
 * Fail-fast validation, called once at server start-up from instrumentation.ts.
 * Throws EnvValidationError (variable names only, never values).
 */
export function assertEnvironmentValid(): void {
  if (envValidationSkipped()) return;
  parsePublicEnv({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  serverEnv();
}
