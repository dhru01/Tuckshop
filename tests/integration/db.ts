import pg from 'pg';

import { pgConnectionConfig } from '@/lib/db/connection';

/** One client per test — avoids stale pool connections after you change DATABASE_URL. */
export async function withClient<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client(pgConnectionConfig());
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
