import type { NextConfig } from 'next';

/**
 * Baseline security headers applied to every response.
 *
 * A strict, nonce-based Content-Security-Policy is deliberately NOT set here yet:
 * it needs per-request nonces (set in proxy.ts) and is scheduled for Phase 12
 * (see docs/SECURITY.md §7 and docs/IMPLEMENTATION_PLAN.md).
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // NFC is allowed because Web NFC is a candidate reader (docs/NFC_INTEGRATION.md).
    value: 'camera=(), microphone=(), geolocation=(), payment=(), nfc=(self)',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Cache Components is intentionally OFF: every page in this product is
  // per-user and dynamic, and we do not want accidental static shells or
  // shared caches around financial/personal data. Revisit when Cache Components
  // becomes the only mode (see docs/ARCHITECTURE.md, decision A-11).
  cacheComponents: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
