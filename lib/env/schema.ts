import { z } from 'zod';

/**
 * Environment schemas. Pure (no `server-only`, no process.env access) so they can be unit-tested.
 * Errors report variable NAMES and rule messages only – never values (values may be secrets).
 */

export const APP_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Treat empty strings (e.g. `FOO=` in .env files) as "not set". */
const optionalString = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(1).optional(),
);

const boolFlag = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
);

/** Variables safe to expose to the browser. Must also be referenced literally in `public.ts`. */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;

const serverEnvBase = z.object({
  APP_ENV: z.enum(APP_ENVS).default('development'),
  SUPABASE_SECRET_KEY: z.string().min(1),
  /** HMAC secret for the signed active-context cookie (falls back to SUPABASE_SECRET_KEY in dev). */
  AUTH_CONTEXT_SECRET: optionalString,
  DATABASE_URL: optionalString,

  UI_SHELL_PREVIEW: boolFlag,
  SIMULATED_NFC_ENABLED: boolFlag,

  PAYFAST_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYFAST_MERCHANT_ID: optionalString,
  PAYFAST_MERCHANT_KEY: optionalString,
  PAYFAST_PASSPHRASE: optionalString,

  EMAIL_API_KEY: optionalString,
  EMAIL_FROM: optionalString,

  CRON_SECRET: optionalString,
  CREDENTIAL_PEPPER: optionalString,
  ENCRYPTION_KEK: optionalString,
  NFC_MASTER_KEY_V1: optionalString,

  SENTRY_DSN: optionalString,
  UPSTASH_REDIS_REST_URL: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
});

/**
 * Cross-field safety rules. In production the application refuses to boot with
 * development-only features enabled or with missing security secrets.
 */
export const serverEnvSchema = serverEnvBase.superRefine((env, ctx) => {
  if (env.APP_ENV !== 'production') return;

  const forbid = (cond: boolean, path: string, message: string) => {
    if (cond) ctx.addIssue({ code: 'custom', path: [path], message });
  };

  forbid(env.UI_SHELL_PREVIEW, 'UI_SHELL_PREVIEW', 'must be false in production');
  forbid(env.SIMULATED_NFC_ENABLED, 'SIMULATED_NFC_ENABLED', 'must be false in production');
  forbid(
    env.PAYFAST_MODE === 'live',
    'PAYFAST_MODE',
    'live payments cannot be enabled via environment; use the audited per-school enablement flow',
  );

  const requireMinLen = (value: string | undefined, path: string, min: number) => {
    if (!value || value.length < min) {
      ctx.addIssue({
        code: 'custom',
        path: [path],
        message: `is required in production (min ${min} characters)`,
      });
    }
  };
  requireMinLen(env.AUTH_CONTEXT_SECRET, 'AUTH_CONTEXT_SECRET', 32);
  requireMinLen(env.CRON_SECRET, 'CRON_SECRET', 32);
  requireMinLen(env.CREDENTIAL_PEPPER, 'CREDENTIAL_PEPPER', 32);
  requireMinLen(env.ENCRYPTION_KEK, 'ENCRYPTION_KEK', 32);
  requireMinLen(env.NFC_MASTER_KEY_V1, 'NFC_MASTER_KEY_V1', 16);
});
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  readonly issues: ReadonlyArray<{ variable: string; message: string }>;

  constructor(issues: ReadonlyArray<{ variable: string; message: string }>) {
    super(
      `Invalid environment configuration:\n${issues
        .map((i) => `  - ${i.variable}: ${i.message}`)
        .join('\n')}\nSee .env.example and README.md.`,
    );
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

type RawEnv = Record<string, string | undefined>;

function parseWith<T>(schema: z.ZodType<T>, raw: RawEnv): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  throw new EnvValidationError(
    result.error.issues.map((i) => ({
      variable: i.path.join('.') || '(root)',
      message: i.message,
    })),
  );
}

export const parsePublicEnv = (raw: RawEnv): PublicEnv => parseWith(publicEnvSchema, raw);
export const parseServerEnv = (raw: RawEnv): ServerEnv => parseWith(serverEnvSchema, raw);
