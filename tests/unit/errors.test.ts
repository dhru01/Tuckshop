import { describe, expect, it } from 'vitest';

import { AppError, ERROR_CODES, isAppError, toClientError } from '@/lib/errors';

describe('AppError', () => {
  it('carries a stable code and a user-safe message', () => {
    const err = new AppError('INSUFFICIENT_FUNDS');
    expect(isAppError(err)).toBe(true);
    expect(err.code).toBe('INSUFFICIENT_FUNDS');
    expect(err.message).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
  });

  it('keeps internal context out of the client representation', () => {
    const err = new AppError('SYSTEM_ERROR', {
      cause: new Error('relation "wallets" does not exist'),
      internal: { sql: 'select * from wallets', host: 'db.internal' },
    });
    const client = toClientError(err);
    expect(JSON.stringify(client)).not.toContain('wallets');
    expect(JSON.stringify(client)).not.toContain('db.internal');
    expect(client).toEqual({ code: 'SYSTEM_ERROR', message: ERROR_CODES.SYSTEM_ERROR });
  });

  it('collapses unknown errors to a generic system error (never leaks details)', () => {
    const client = toClientError(new Error('password authentication failed for user "postgres"'));
    expect(client.code).toBe('SYSTEM_ERROR');
    expect(client.message).not.toMatch(/postgres|password/i);
  });

  it('handles non-Error throwables', () => {
    expect(toClientError('boom').code).toBe('SYSTEM_ERROR');
    expect(toClientError(undefined).code).toBe('SYSTEM_ERROR');
  });
});
