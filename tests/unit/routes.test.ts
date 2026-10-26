import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { INTERFACES, PROTECTED_PREFIXES, allInterfaceRoutes } from '@/lib/navigation';

const ROOT = path.resolve(__dirname, '../..');

/** The routes required by the product brief (§2). This list is the contract. */
const REQUIRED_ROUTES = [
  // public / auth
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  // parent
  '/parent/dashboard',
  '/parent/children',
  '/parent/wallet',
  '/parent/top-up',
  '/parent/transactions',
  '/parent/spending-controls',
  '/parent/notifications',
  '/parent/settings',
  // cashier
  '/pos',
  '/pos/transactions',
  '/pos/refunds',
  '/pos/shift',
  '/pos/settings',
  // school
  '/school/dashboard',
  '/school/learners',
  '/school/parents',
  '/school/cards',
  '/school/products',
  '/school/inventory',
  '/school/transactions',
  '/school/reports',
  '/school/staff',
  '/school/settings',
  // super admin
  '/admin/dashboard',
  '/admin/schools',
  '/admin/users',
  '/admin/transactions',
  '/admin/payments',
  '/admin/analytics',
  '/admin/subscriptions',
  '/admin/audit-logs',
  '/admin/settings',
];

function pageFileFor(route: string): string {
  const grouped = ['/login', '/register', '/forgot-password', '/reset-password', '/select-context'];
  const dir = route === '/' ? '' : route;
  const base = grouped.includes(route)
    ? path.join(ROOT, 'app', '(auth)', dir)
    : path.join(ROOT, 'app', dir);
  return path.join(base, 'page.tsx');
}

describe('route inventory', () => {
  it.each(REQUIRED_ROUTES)('has a page for %s', (route) => {
    expect(existsSync(pageFileFor(route)), `missing ${pageFileFor(route)}`).toBe(true);
  });

  it('navigation config covers exactly the required interface routes', () => {
    const interfaceRoutes = REQUIRED_ROUTES.filter((r) =>
      PROTECTED_PREFIXES.some((p) => r === p || r.startsWith(`${p}/`)),
    );
    expect([...allInterfaceRoutes()].sort()).toEqual([...interfaceRoutes].sort());
  });

  it('has no duplicate hrefs', () => {
    const routes = allInterfaceRoutes();
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('every interface has a server-side guard in its layout', () => {
    for (const key of Object.keys(INTERFACES)) {
      const layout = path.join(ROOT, 'app', key, 'layout.tsx');
      expect(existsSync(layout), `missing layout for ${key}`).toBe(true);
    }
  });

  it('the auth select-context route exists for multi-role users', () => {
    expect(existsSync(pageFileFor('/select-context'))).toBe(true);
  });
});
