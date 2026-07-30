import { test, expect } from '@playwright/test';

import { requireBrowserAuthEmulator } from '../support/require-auth-emulator';
import { seedAuditAndOrderIfNeeded } from '../support/seed';
import { createTestEmail } from '../support/testmail';

/**
 * J1.T1.6 — Confirm Details.
 * Verify the business details form accepts valid data and advances the
 * user. Starts from a fresh signup (end state of Test 1.5) via
 * seedAuditAndOrderIfNeeded() + the real signup flow.
 */
test.beforeEach(async ({ page }) => {
  await requireBrowserAuthEmulator(page);
});

test('confirm details accepts valid input and advances to access', async ({
  page,
  baseURL,
}) => {
  const testEmail = createTestEmail('bs-e2e-t1-6');

  const { orderId } = await seedAuditAndOrderIfNeeded({
    baseURL: baseURL!,
    sku: 'speed_fix',
    normalizedEmail: testEmail.email,
    businessName: 'Book Service E2E T1.6',
  });

  await page.goto(`/book-service/signup?orderId=${orderId}`);
  await page.getByLabel('Email').fill(testEmail.email);
  await page.getByLabel('Password').fill('e2e-test-password-123');
  await page.getByRole('button', { name: 'Create New Account' }).click();
  await expect(page).toHaveURL(new RegExp(`/book-service/confirm-details\\?orderId=${orderId}`));

  await expect(page.getByLabel('Business name')).toBeVisible();
  await page.getByLabel('Business name').fill('Book Service E2E T1.6');
  await page.getByLabel('Website URL').fill('https://example.com');
  await page.getByLabel('First Name').fill('QA');
  await page.getByLabel('Email address').fill(testEmail.email);

  await page.getByRole('button', { name: 'Yes, this is correct' }).click();

  // No validation errors on valid input; route advances to access submission.
  await expect(page).toHaveURL(new RegExp(`/book-service/access\\?orderId=${orderId}`));
});
