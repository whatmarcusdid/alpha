import { test, expect } from '@playwright/test';

import { AUDIT_LEAD_ID_STORAGE_KEY, SKU_DISPLAY_NAMES } from './support/constants';
import { postSignedCheckoutSessionCompleted } from './support/stripe-webhook';

/**
 * The one spec in this suite that completes a real Stripe test-mode payment
 * (card 4242...). Requires the Firebase emulator suite running (writes must
 * land in the emulator's `orders` collection, not the real Firestore
 * project) and playwright.config.ts's webServer env override so Stripe's
 * success_url redirects back to this local server instead of production.
 *
 * Rather than depending on `stripe listen` (a second background process
 * with a rotating secret) to deliver the real webhook, this test signs and
 * POSTs its own checkout.session.completed event after the real payment
 * completes — deterministic, and still exercises the real webhook route +
 * real handleSiteFixPayment write.
 */
test('real checkout payment + synthetic webhook -> confirmation page resolves', async ({
  page,
  baseURL,
}) => {
  // Real audit scan + real Stripe checkout/payment + webhook + confirmation
  // poll (~23s) all in one flow — needs more headroom than the default.
  test.setTimeout(180_000);

  await page.goto('/audit');

  await page.getByLabel('First name').fill('QA');
  await page.getByLabel('Business name').fill('Book Service E2E');
  await page.getByLabel('Email address').fill(`bs-e2e-${Date.now()}@example.com`);
  await page.getByLabel('Website URL').fill('https://example.com');
  await page.getByRole('button', { name: 'Run My Free Audit' }).click();

  const loadingHeading = page.getByRole('heading', { name: 'Analyzing your site…' });
  await expect(loadingHeading).toBeVisible();
  await expect(loadingHeading).toBeHidden({ timeout: 90_000 });

  const viewFixesButton = page.getByRole('button', { name: 'View my site fixes' });
  await expect(viewFixesButton).toBeEnabled({ timeout: 15_000 });
  await viewFixesButton.click();

  await expect(page).toHaveURL(/\/book-service\/select\?skus=/);

  const auditLeadId = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    AUDIT_LEAD_ID_STORAGE_KEY
  );
  expect(auditLeadId).toBeTruthy();

  const url = new URL(page.url());
  const skus = (url.searchParams.get('skus') ?? '')
    .split(',')
    .filter((sku): sku is keyof typeof SKU_DISPLAY_NAMES => sku in SKU_DISPLAY_NAMES);
  expect(skus.length).toBeGreaterThan(0);
  const sku = skus[0];

  const card = page.locator('article', { hasText: SKU_DISPLAY_NAMES[sku] });
  await card.getByRole('button', { name: 'Select' }).click();

  await expect(page).toHaveURL(new RegExp(`/book-service/select/${sku}\\?`));
  await page.getByRole('button', { name: 'Proceed To Checkout' }).click();

  // Real checkout API call + real Stripe test-mode session creation.
  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 20_000 });

  await expect(page.getByRole('heading', { name: 'Payment method' })).toBeVisible();
  await page.getByPlaceholder('email@example.com').fill(`bs-e2e-pay-${Date.now()}@example.com`);
  // "Card" is collapsed by default when multiple payment methods are
  // offered. The radio's visual overlay (an accordion toggle button) fails
  // Playwright's pointer-interception check, so force the click directly
  // on the radio rather than fighting the overlay — matches how selecting
  // "Card" expands the inline number/expiry/CVC fields.
  const cardRadio = page.getByRole('radio', { name: 'Card', exact: true });
  if (await cardRadio.count()) {
    await cardRadio.click({ force: true });
  }
  await page.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242');
  await page.getByPlaceholder('MM / YY').fill('12/34');
  await page.getByPlaceholder('CVC').fill('123');
  await page.getByPlaceholder('Full name on card').fill('QA Test');
  await page.getByPlaceholder('ZIP').fill('94103');
  // "Save my information for faster checkout" (Link) is checked by default,
  // which requires a phone number — fill it rather than hunting for the
  // checkbox to uncheck, avoiding any Link OTP flow.
  const phoneField = page.getByPlaceholder('(201) 555-0123');
  if (await phoneField.isVisible().catch(() => false)) {
    await phoneField.fill('2015550123');
  }

  await page.locator('button[type="submit"]').click();

  // Real Stripe payment processing + redirect back to our confirmation page.
  await page.waitForURL(/\/book-service\/confirmation\?orderId=/, { timeout: 30_000 });

  const orderId = new URL(page.url()).searchParams.get('orderId');
  expect(orderId).toBeTruthy();

  const webhookResponse = await postSignedCheckoutSessionCompleted(baseURL!, {
    orderId: orderId!,
    auditLeadId: auditLeadId!,
    sku,
    normalizedEmail: '',
  });
  expect(webhookResponse.status).toBe(200);

  // Confirmation page polls GET /api/book-service/order-status with backoff
  // [1000,2000,4000,8000,8000]ms (~23s total) until it sees the order our
  // synthetic webhook just wrote.
  await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(`Order ID: #${orderId}`)).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(new RegExp(`/book-service/signup\\?orderId=${orderId}`));
});
