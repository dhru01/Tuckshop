import { config } from 'dotenv';
import pg from 'pg';
import { beforeAll } from 'vitest';

import { pgConnectionConfig } from '@/lib/db/connection';

config({ path: '.env.local' });

/**
 * Safety net: integration tests create and mutate data. They may only run against a
 * development/test environment and must never see a production configuration.
 */
beforeAll(async () => {
  const appEnv = process.env.APP_ENV ?? 'development';
  if (appEnv === 'production' || appEnv === 'staging') {
    throw new Error(`Refusing to run integration tests with APP_ENV=${appEnv}.`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Integration tests need a real Postgres (your hosted Supabase DEV project). See README.md.',
    );
  }

  const client = new pg.Client(pgConnectionConfig());
  try {
    await client.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `DATABASE_URL could not connect (${message}). ` +
        'Resetting the password in Supabase does not update .env.local — copy a fresh Session pooler URI ' +
        'from Connect → Database and replace the whole DATABASE_URL line, then run npm run db:check.',
    );
  } finally {
    await client.end();
  }
});
