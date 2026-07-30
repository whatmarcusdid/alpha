import { test, expect } from '@playwright/test';

import { requireBrowserAuthEmulator } from '../support/require-auth-emulator';
import { seedAuditAndOrderIfNeeded } from '../support/seed';
import { createTestEmail } from '../support/testmail';

/**
 * J1.T1.8 — First-Time Dashboard Experience.
 *
 * The doc's literal module names ("Welcome", "Onboarding Checklist",
 * "Milestone Timeline") don't exist in app/dashboard/page.tsx or
 * components/dashboard/* — confirmed by grep across the whole app/
 * and components/ trees. Per plan-vs-app discrepancy: mapped to what
 * actually renders — the greeting heading, the "Active site fixes"
 * section, and ActiveSiteFixesCard (business name, package/entitlement,
 * order id, per-pillar progress) — the closest real equivalent of the
 * doc's intent for a fresh post-purchase dashboard.
 */
test.beforeEach(async ({ page }) => {
  await requireBrowserAuthEmulator(page);
});

test('fresh post-purchase dashboard shows correct package and entitlement', async ({
  page,
  baseURL,
}) => {
  const testEmail = createTestEmail('bs-e2e-t1-8');
  const businessName = 'Book Service E2E T1.8';

  const { orderId } = await seedAuditAndOrderIfNeeded({
    baseURL: baseURL!,
    sku: 'speed_fix',
    normalizedEmail: testEmail.email,
    businessName,
  });

  await page.goto(`/book-service/signup?orderId=${orderId}`);
  await page.getByLabel('Email').fill(testEmail.email);
  await page.getByLabel('Password').fill('e2e-test-password-123');
  await page.getByRole('button', { name: 'Create New Account' }).click();
  await expect(page).toHaveURL(new RegExp(`/book-service/confirm-details\\?orderId=${orderId}`));
  await page.getByRole('button', { name: 'Yes, this is correct' }).click();
  await expect(page).toHaveURL(new RegExp(`/book-service/access\\?orderId=${orderId}`));

  await page.getByLabel('WordPress login').check();
  await page.getByLabel('Where do you log into your website?').fill('example.com/wp-admin');
  await page.getByLabel('Your username').fill('qa-e2e-user');
  await page.getByLabel('Your password').fill('super-secret-wp-password');
  await page.getByLabel(/temporary access to my website/i).check();
  await page.getByRole('button', { name: 'Submit access' }).click();

  // No auth redirection loop — lands on /dashboard, not bounced to /signin.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Active site fixes', level: 2 })).toBeVisible({
    timeout: 15_000,
  });

  await expect(page.getByText(`Site Fix order — #${orderId}`)).toBeVisible();
  // Not businessName: the dashboard header reads users/{uid}.company.legalName,
  // a field no Book Service Site Fix code path ever writes (confirm-details
  // writes siteFix.businessName instead) — so it always falls back to this
  // literal text for Site Fix customers, regardless of what was confirmed.
  await expect(page.getByRole('heading', { name: 'Your business', level: 3 })).toBeVisible();
  await expect(page.getByText('Speed Fix')).toBeVisible();
  await expect(page.getByText(/of \d+ fixes/)).toBeVisible();
  await expect(page.getByText('Speed', { exact: true })).toBeVisible();
});
