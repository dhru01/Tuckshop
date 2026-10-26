import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('landing page renders with sign-in and register links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cashless tuck shop');
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
  });

  test('sends baseline security headers', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-powered-by']).toBeUndefined();
  });
});

test.describe('protected interfaces fail closed without a session', () => {
  for (const route of ['/parent/dashboard', '/pos', '/school/dashboard', '/admin/dashboard']) {
    test(`${route} redirects anonymous visitors to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('tampering with a role cookie does not grant access', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'tuckshop_active_context',
        value: 'forged.payload.forgedsig',
        url: 'http://localhost:3100',
      },
    ]);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
