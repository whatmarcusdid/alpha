import { test, expect } from '@playwright/test';

/**
 * middleware.ts guards these paths purely on `bs-auth` cookie presence,
 * before any page JS runs — no emulator/Stripe dependency needed here.
 */
test.describe('auth guard redirects', () => {
  test('redirects unauthenticated /dashboard to /signin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fdashboard/);
  });

  test('redirects unauthenticated /book-service/access to /signin (no preview bypass)', async ({ page }) => {
    // Deliberately no ?preview=1 — that bypass exists for confirm-details/access
    // design review in development, and this test verifies the real guard.
    await page.goto('/book-service/access');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fbook-service%2Faccess/);
  });

  test('redirects unauthenticated /admin to /signin', async ({ page }) => {
    await page.goto('/admin/needs-audit-lead-link');
    await expect(page).toHaveURL(/\/signin\?redirect=%2Fadmin%2Fneeds-audit-lead-link/);
  });
});
