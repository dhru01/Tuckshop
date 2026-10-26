import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Project guard-rails (docs/SECURITY.md §6, docs/IMPLEMENTATION_PLAN.md §5).
 * These turn the "development rules" into build failures where practical.
 */

// Modules permitted to use the service-role (RLS-bypassing) client.
const SERVICE_ROLE_ALLOW_LIST = [
  'lib/supabase/admin.ts',
  'services/**',
  'app/api/webhooks/**',
  'app/api/cron/**',
  'tests/**',
  'scripts/**',
];

// Modules that handle money: no floating-point helpers allowed.
const MONEY_MODULES = ['lib/wallets/**', 'services/wallet-service/**', 'services/pos-service/**'];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // XSS: never inject raw HTML.
      'react/no-danger': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Service-role client may only be imported from the allow-list.
  {
    files: ['**/*.{ts,tsx,mts}'],
    ignores: SERVICE_ROLE_ALLOW_LIST,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/supabase/admin', '**/lib/supabase/admin', '**/supabase/admin'],
              message:
                'The service-role client bypasses RLS. Import it only from services/*, app/api/webhooks/** or app/api/cron/** (docs/SECURITY.md §6).',
            },
          ],
        },
      ],
    },
  },

  // Money code: integer cents only.
  {
    files: MONEY_MODULES,
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Do not use floating point for money. Use integer cents.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          property: 'toFixed',
          message: 'Do not use toFixed for money. Use formatRand() on integer cents.',
        },
        {
          object: 'Number',
          property: 'parseFloat',
          message: 'Do not use floating point for money.',
        },
      ],
    },
  },

  // CLI scripts print to the console by design.
  { files: ['scripts/**'], rules: { 'no-console': 'off' } },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    // Vendored shadcn/ui primitives.
    'components/ui/**',
  ]),
]);

export default eslintConfig;
