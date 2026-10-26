/**
 * `npm run env:check` – validates .env.local the same way the server does at start-up.
 * Prints variable NAMES and rule messages only (never values).
 */
import { config } from 'dotenv';

import { EnvValidationError, parsePublicEnv, parseServerEnv } from '../lib/env/schema';

config({ path: '.env.local' });

try {
  parsePublicEnv(process.env);
  const env = parseServerEnv(process.env);
  console.log(`Environment OK (APP_ENV=${env.APP_ENV}).`);
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
