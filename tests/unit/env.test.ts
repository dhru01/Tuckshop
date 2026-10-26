import { describe, expect, it } from 'vitest';

import { EnvValidationError, parsePublicEnv, parseServerEnv } from '@/lib/env/schema';

const validPublic = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
};

const validServer = { SUPABASE_SECRET_KEY: 'sb_secret_x' };

describe('public env', () => {
  it('accepts a valid configuration', () => {
    expect(parsePublicEnv(validPublic).NEXT_PUBLIC_SUPABASE_URL).toBe(
      validPublic.NEXT_PUBLIC_SUPABASE_URL,
    );
  });

  it('fails fast and names the missing variables (not their values)', () => {
    try {
      parsePublicEnv({ NEXT_PUBLIC_APP_URL: 'not-a-url' });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      const message = (e as Error).message;
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      expect(message).not.toContain('not-a-url');
    }
  });
});

describe('server env', () => {
  it('applies safe defaults', () => {
    const env = parseServerEnv(validServer);
    expect(env.APP_ENV).toBe('development');
    expect(env.UI_SHELL_PREVIEW).toBe(false);
    expect(env.SIMULATED_NFC_ENABLED).toBe(false);
    expect(env.PAYFAST_MODE).toBe('sandbox');
  });

  it('requires the service-role secret', () => {
    expect(() => parseServerEnv({})).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it('treats empty strings as unset', () => {
    const env = parseServerEnv({ ...validServer, EMAIL_API_KEY: '', DATABASE_URL: '  ' });
    expect(env.EMAIL_API_KEY).toBeUndefined();
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it('parses boolean flags', () => {
    const env = parseServerEnv({
      ...validServer,
      UI_SHELL_PREVIEW: 'true',
      SIMULATED_NFC_ENABLED: '1',
    });
    expect(env.UI_SHELL_PREVIEW).toBe(true);
    expect(env.SIMULATED_NFC_ENABLED).toBe(true);
  });

  it('rejects unknown flag values instead of guessing', () => {
    expect(() => parseServerEnv({ ...validServer, UI_SHELL_PREVIEW: 'yes' })).toThrow(
      EnvValidationError,
    );
  });
});

describe('production safety rules', () => {
  const prodSecrets = {
    AUTH_CONTEXT_SECRET: 'a'.repeat(32),
    CRON_SECRET: 'c'.repeat(32),
    CREDENTIAL_PEPPER: 'p'.repeat(32),
    ENCRYPTION_KEK: 'k'.repeat(32),
    NFC_MASTER_KEY_V1: 'n'.repeat(16),
  };
  const prod = { ...validServer, APP_ENV: 'production', ...prodSecrets };

  it('accepts a correctly configured production environment', () => {
    expect(parseServerEnv(prod).APP_ENV).toBe('production');
  });

  it('refuses to boot with the simulated NFC reader enabled', () => {
    expect(() => parseServerEnv({ ...prod, SIMULATED_NFC_ENABLED: 'true' })).toThrow(
      /SIMULATED_NFC_ENABLED/,
    );
  });

  it('refuses to boot with the UI shell preview enabled', () => {
    expect(() => parseServerEnv({ ...prod, UI_SHELL_PREVIEW: 'true' })).toThrow(/UI_SHELL_PREVIEW/);
  });

  it('refuses live payments enabled through the environment', () => {
    expect(() => parseServerEnv({ ...prod, PAYFAST_MODE: 'live' })).toThrow(/PAYFAST_MODE/);
  });

  it.each([
    'AUTH_CONTEXT_SECRET',
    'CRON_SECRET',
    'CREDENTIAL_PEPPER',
    'ENCRYPTION_KEK',
    'NFC_MASTER_KEY_V1',
  ])(
    'requires %s in production',
    (name) => {
      const raw: Record<string, string> = { ...prod };
      delete raw[name];
      expect(() => parseServerEnv(raw)).toThrow(new RegExp(name));
    },
  );

  it('does not require those secrets outside production', () => {
    expect(() => parseServerEnv({ ...validServer, APP_ENV: 'development' })).not.toThrow();
  });
});
