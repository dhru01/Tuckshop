/**
 * Applies SQL files in supabase/migrations/ to DATABASE_URL (dev project only).
 * Usage: npm run db:migrate
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { config } from 'dotenv';
import pg from 'pg';

import { pgConnectionConfig } from '../lib/db/connection';

config({ path: '.env.local' });

const appEnv = process.env.APP_ENV ?? 'development';
if (appEnv === 'production' || appEnv === 'staging') {
  console.error(`Refusing to migrate with APP_ENV=${appEnv}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const dir = join(process.cwd(), 'supabase/migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new pg.Client(pgConnectionConfig(databaseUrl));

async function main() {
  await client.connect();
  await client.query('create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  for (const file of files) {
    const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
    const applied = await client.query('select 1 from public.schema_migrations where name = $1', [name]);
    if (applied.rowCount && applied.rowCount > 0) {
      console.log(`skip ${name}`);
      continue;
    }
    const sql = readFileSync(join(dir, file), 'utf8');
    console.log(`apply ${name}…`);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into public.schema_migrations (name) values ($1)', [name]);
      await client.query('commit');
      console.log(`ok ${name}`);
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
