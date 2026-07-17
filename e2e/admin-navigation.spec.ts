import { test, expect } from '@playwright/test';

import { createAdminTestUser, signInAdminViaUi } from './support/admin-auth';
import { requireBrowserAuthEmulator } from './support/require-auth-emulator';

/**
 * Authenticated admin route coverage — complements auth-guard.spec.ts, which
 * only verifies unauthenticated middleware redirects.
 *
 * Requires Firebase Emulator Suite (Auth on 9099) and
 * NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true (playwright.config.ts webServer.env).
 */
test.describe('authenticated admin navigation', () => {
  test.beforeEach(async ({ page }) => {
    await requireBrowserAuthEmulator(page);
  });

  test('admin with claim loads /admin home (not 404)', async ({ page }) => {
    const credentials = await createAdminTestUser();
    await signInAdminViaUi(page, credentials);

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('Loading fix jobs')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'New jobs' })).toBeVisible();
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
    await expect(page.getByText('Page not found')).toHaveCount(0);
  });

  test('admin with claim loads /admin/needs-audit-lead-link (not 404)', async ({ page }) => {
    const credentials = await createAdminTestUser();
    await signInAdminViaUi(page, credentials);

    await page.goto('/admin/needs-audit-lead-link');

    await expect(page).toHaveURL(/\/admin\/needs-audit-lead-link/);
    await expect(page.getByRole('heading', { name: 'Needs Audit Lead Link' })).toBeVisible();
    await expect(page.getByText('Page not found')).toHaveCount(0);
  });

  test('admin with claim loads /admin/fix-jobs table view (not 404)', async ({ page }) => {
    const credentials = await createAdminTestUser();
    await signInAdminViaUi(page, credentials);

    await page.goto('/admin/fix-jobs');

    await expect(page).toHaveURL(/\/admin\/fix-jobs/);
    await expect(page.getByRole('heading', { name: 'Fix jobs — table view' })).toBeVisible();
    await expect(page.getByText('Page not found')).toHaveCount(0);
  });
});
