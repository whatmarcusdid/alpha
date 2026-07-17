import { test, expect } from '@playwright/test';

import { requireBrowserAuthEmulator } from './support/require-auth-emulator';
import {
  getClaimedUserId,
  getFixSessionStage,
  getUserDoc,
  seedSiteFixOrder,
} from './support/seed';

/**
 * Journey C: Signup -> Confirm Details -> Access -> Dashboard. Seeds its own
 * pending_orders/auditLeads docs directly via the Admin SDK (against the
 * Firebase Emulator Suite) rather than chaining off a real checkout, so this
 * file is independently runnable. Requires the emulator suite running and
 * NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true (set in playwright.config.ts's
 * webServer.env) so the browser-side Firebase SDK gets a real, emulator-
 * issued ID token — needed to reach the confirm-details/access API routes.
 */
test.describe('signup to access', () => {
  test.beforeEach(async ({ page }) => {
    await requireBrowserAuthEmulator(page);
  });

  test('signup -> confirm details -> access -> dashboard, with encrypted access credentials', async ({
    page,
  }) => {
    const orderId = `order-e2e-${Date.now()}`;
    const auditLeadId = `audit-lead-e2e-${Date.now()}`;
    const normalizedEmail = `bs-e2e-signup-${Date.now()}@example.com`;

    await seedSiteFixOrder({
      orderId,
      auditLeadId,
      sku: 'speed_fix',
      normalizedEmail,
      firstName: 'QA',
      businessName: 'Book Service E2E',
      websiteUrl: 'https://example.com',
    });

    await page.goto(`/book-service/signup?orderId=${orderId}`);

    await page.getByLabel('Email').fill(normalizedEmail);
    await page.getByLabel('Password').fill('e2e-test-password-123');

    // Google/Apple buttons are non-functional placeholders on this flow —
    // resolves the original doc's "Apple Sign-In untested" flag: it's not a
    // coverage gap, the button doesn't do anything yet.
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(
      page.getByText(/please create an account with the email address/i)
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/book-service/signup\\?orderId=${orderId}`));

    await page.getByRole('button', { name: 'Create New Account' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/book-service/confirm-details\\?orderId=${orderId}`)
    );

    // Pre-filled from the seeded audit lead via createUserWithSiteFixOrder —
    // verify the pre-fill wiring rather than overwriting it.
    await expect(page.getByLabel('Business name')).toHaveValue('Book Service E2E');
    await expect(page.getByLabel('Website URL')).toHaveValue('https://example.com');
    await expect(page.getByLabel('First Name')).toHaveValue('QA');
    await expect(page.getByLabel('Email address')).toHaveValue(normalizedEmail);

    await page.getByRole('button', { name: 'Yes, this is correct' }).click();
    await expect(page).toHaveURL(new RegExp(`/book-service/access\\?orderId=${orderId}`));

    await page.getByLabel('WordPress login').check();
    await page.getByLabel('Where do you log into your website?').fill('example.com/wp-admin');
    await page.getByLabel('Your username').fill('qa-e2e-user');
    await page.getByLabel('Your password').fill('super-secret-wp-password');
    await page.getByLabel(/temporary access to my website/i).check();

    await page.getByRole('button', { name: 'Submit access' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const uid = await getClaimedUserId(orderId);
    expect(uid).toBeTruthy();

    // Security assertion (deliberate, not skipped): the raw password must
    // never be persisted — only the AES-256-GCM encrypted form.
    const userDoc = await getUserDoc(uid!);
    const accessRequest = userDoc?.siteFix?.access_request;
    expect(typeof accessRequest?.passwordEncrypted).toBe('string');
    expect(accessRequest?.passwordEncrypted.length).toBeGreaterThan(0);
    expect(accessRequest?.password).toBeUndefined();

    expect(userDoc?.siteFix?.onboardingStatus).toBe('delivery_ready');

    // Note: transitionAwaitingAccessToReady (the other half of the "two
    // stage systems" in submit-access/route.ts) silently no-ops when
    // users/{uid}/fixSessions/{orderId} doesn't exist yet — that doc is
    // only created by the real payment webhook (ensureFixSessionForOrder),
    // which this journey deliberately doesn't chain off of. So there's
    // nothing to seed here without also faking webhook-created Auth/Firestore
    // state that would conflict with createUserWithSiteFixOrder's own
    // "existing account" handling. Asserting it stays absent documents that
    // real asymmetry rather than silently skipping it.
    const fixSession = await getFixSessionStage(uid!, orderId);
    expect(fixSession).toBeUndefined();
  });

  test('"Save and finish later" does not trigger the stage transition', async ({ page }) => {
    const orderId = `order-e2e-partial-${Date.now()}`;
    const auditLeadId = `audit-lead-e2e-partial-${Date.now()}`;
    const normalizedEmail = `bs-e2e-partial-${Date.now()}@example.com`;

    await seedSiteFixOrder({
      orderId,
      auditLeadId,
      sku: 'speed_fix',
      normalizedEmail,
      firstName: 'QA',
      businessName: 'Book Service E2E',
      websiteUrl: 'https://example.com',
    });

    await page.goto(`/book-service/signup?orderId=${orderId}`);
    await page.getByLabel('Email').fill(normalizedEmail);
    await page.getByLabel('Password').fill('e2e-test-password-123');
    await page.getByRole('button', { name: 'Create New Account' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/book-service/confirm-details\\?orderId=${orderId}`)
    );
    await page.getByRole('button', { name: 'Yes, this is correct' }).click();
    await expect(page).toHaveURL(new RegExp(`/book-service/access\\?orderId=${orderId}`));

    // Partial save doesn't require the full form to be filled.
    await page.getByRole('button', { name: 'Save and finish later' }).click();

    // No redirect to /dashboard on a partial save.
    await expect(page).toHaveURL(new RegExp(`/book-service/access\\?orderId=${orderId}`));

    const uid = await getClaimedUserId(orderId);
    expect(uid).toBeTruthy();

    const userDoc = await getUserDoc(uid!);
    expect(userDoc?.siteFix?.onboardingStatus).toBe('awaiting_access');
  });
});
