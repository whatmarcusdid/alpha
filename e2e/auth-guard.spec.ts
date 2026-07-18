import { test, expect } from '@playwright/test';

/**
 * middleware.ts verifies the HttpOnly __session cookie server-side via
 * /api/auth/verify-session — forged or absent cookies must not bypass the guard.
 */
test.describe('auth guard redirects', () => {
  test('redirects unauthenticated /dashboard to /signin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fdashboard/);
  });

  test('redirects unauthenticated /book-service/access to /signin (no preview bypass)', async ({
    page,
  }) => {
    await page.goto('/book-service/access');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fbook-service%2Faccess/);
  });

  test('redirects unauthenticated /admin to /signin', async ({ page }) => {
    await page.goto('/admin/needs-audit-lead-link');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fadmin%2Fneeds-audit-lead-link/);
  });

  test('redirects forged __session cookie to /signin', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__session',
        value: 'forged.invalid.session-cookie',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fdashboard/);
  });
});
