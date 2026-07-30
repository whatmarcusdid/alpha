import { test, expect } from '@playwright/test';

import { requireBrowserAuthEmulator } from '../support/require-auth-emulator';
import { seedAuditAndOrderIfNeeded } from '../support/seed';
import { createTestEmail } from '../support/testmail';

/**
 * J1.T1.7 — Submit Access Credentials.
 * Verify the access form accepts input and transitions the user into the
 * dashboard. Starts from confirmed details (end state of Test 1.6).
 */
test.beforeEach(async ({ page }) => {
  await requireBrowserAuthEmulator(page);
});

test('submitting access credentials succeeds and reaches the dashboard', async ({
  page,
  baseURL,
}) => {
  const testEmail = createTestEmail('bs-e2e-t1-7');

  const { orderId } = await seedAuditAndOrderIfNeeded({
    baseURL: baseURL!,
    sku: 'speed_fix',
    normalizedEmail: testEmail.email,
    businessName: 'Book Service E2E T1.7',
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

  // Success — no validation errors and redirect to the dashboard.
  await expect(page).toHaveURL(/\/dashboard/);
});
