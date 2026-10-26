import type { ClientConfig } from 'pg';

const PROJECT_REF = 'snxlgfnrxrvfcktbfpav';
const POOLER_HOST = 'aws-0-eu-west-2.pooler.supabase.com';

function parsePgUrl(raw: string): URL {
  return new URL(raw.trim().replace(/^postgresql:/, 'http:'));
}

/**
 * Supabase "direct" hostnames (db.<ref>.supabase.co) are often IPv6-only; many networks
 * refuse the connection (ECONNREFUSED). Session pooler uses IPv4 and is the recommended
 * default for local CLI/tests.
 */
export function resolveDatabaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error('DATABASE_URL is not set');
  }
  const config = pgConnectionConfig(raw);
  if (typeof config.connectionString === 'string') {
    return config.connectionString;
  }
  const parsed = parsePgUrl(raw);
  const user = typeof config.user === 'string' ? config.user : 'postgres';
  const host = typeof config.host === 'string' ? config.host : 'localhost';
  const port = typeof config.port === 'number' ? config.port : 5432;
  const database = typeof config.database === 'string' ? config.database : 'postgres';
  const pass = decodeURIComponent(parsed.password);
  const auth = `${user}:${encodeURIComponent(pass)}`;
  return `postgresql://${auth}@${host}:${port}/${database}`;
}

export function pgConnectionConfig(databaseUrl?: string): ClientConfig {
  const raw = databaseUrl ?? process.env.DATABASE_URL;
  if (!raw?.trim()) {
    throw new Error('DATABASE_URL is not set');
  }

  const u = parsePgUrl(raw);
  const database = u.pathname.replace(/^\//, '') || 'postgres';
  const password = u.password; // URL-decoded once by the WHATWG URL parser
  const ssl = { rejectUnauthorized: false };

  if (u.hostname === `db.${PROJECT_REF}.supabase.co` && (u.port === '5432' || u.port === '')) {
    return {
      host: POOLER_HOST,
      port: 6543,
      user: `postgres.${PROJECT_REF}`,
      password,
      database,
      ssl,
    };
  }

  return {
    connectionString: raw.trim(),
    ssl,
  };
}
