import { describe, expect, it } from 'vitest';

import { resolveDatabaseUrl } from '@/lib/db/connection';

describe('resolveDatabaseUrl', () => {
  it('rewrites Supabase direct host to session pooler', () => {
    const raw =
      'postgresql://postgres:secret%40word@db.snxlgfnrxrvfcktbfpav.supabase.co:5432/postgres';
    const out = resolveDatabaseUrl(raw);
    expect(out).toContain('aws-0-eu-west-2.pooler.supabase.com:6543');
    expect(out).toContain('postgres.snxlgfnrxrvfcktbfpav');
    expect(out).toMatch(/secret(%40|@)word/);
  });

  it('leaves custom URLs unchanged', () => {
    const custom = 'postgresql://user:pass@localhost:5432/app';
    expect(resolveDatabaseUrl(custom)).toBe(custom);
  });
});
