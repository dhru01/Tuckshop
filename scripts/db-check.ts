/**
 * Quick Postgres connectivity check (uses pooler when direct host is IPv6-only).
 * Usage: npm run db:check
 */
import { config } from 'dotenv';
import pg from 'pg';

import { pgConnectionConfig, resolveDatabaseUrl } from '../lib/db/connection';

config({ path: '.env.local' });

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('DATABASE_URL is not set in .env.local');
    process.exit(1);
  }
  const resolved = resolveDatabaseUrl(raw);
  if (resolved !== raw.trim()) {
    console.log('Using session pooler (direct db.* host is often unreachable from local networks).');
  }
  const client = new pg.Client(pgConnectionConfig(raw));
  await client.connect();
  const { rows } = await client.query('select current_user as user, version()');
  console.log('Connected as', rows[0]?.user);
  await client.end();
}

main().catch((err: Error) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
