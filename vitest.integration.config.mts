import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Integration tests run against a REAL PostgreSQL (hosted Supabase DEV project, DATABASE_URL).
 * RLS, ledger triggers and row-locking cannot be validated with mocks.
 * Never point these tests at production (tests/integration/setup.ts enforces this).
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': path.resolve(import.meta.dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    // Concurrency tests open several connections; keep files serial for determinism.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    passWithNoTests: true,
  },
});
