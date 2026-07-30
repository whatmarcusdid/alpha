import { test, expect } from '@playwright/test';

import { requireBrowserAuthEmulator } from '../support/require-auth-emulator';
import { seedAuditAndOrderIfNeeded } from '../support/seed';
import { createTestEmail } from '../support/testmail';

/**
 * J1.T1.5 — Signup & Order Claim.
 * Verify a new user can sign up and their order is correctly claimed.
 * Uses seedAuditAndOrderIfNeeded() to reach "just paid" (end state of Test
 * 1.4) without re-driving a real Stripe Checkout in every downstream spec.
 */
test.beforeEach(async ({ page }) => {
  await requireBrowserAuthEmulator(page);
});

test('signup creates account and claims the pending order', async ({ page, baseURL }) => {
  const testEmail = createTestEmail('bs-e2e-t1-5');

  const { orderId } = await seedAuditAndOrderIfNeeded({
    baseURL: baseURL!,
    sku: 'speed_fix',
    normalizedEmail: testEmail.email,
    businessName: 'Book Service E2E T1.5',
  });

  await page.goto(`/book-service/signup?orderId=${orderId}`);

  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByLabel('Email').fill(testEmail.email);
  await page.getByLabel('Password').fill('e2e-test-password-123');
  await page.getByRole('button', { name: 'Create New Account' }).click();

  // No validation errors for valid input; redirected to confirm-details —
  // not stuck in pending order limbo.
  await expect(page).toHaveURL(new RegExp(`/book-service/confirm-details\\?orderId=${orderId}`));
});
