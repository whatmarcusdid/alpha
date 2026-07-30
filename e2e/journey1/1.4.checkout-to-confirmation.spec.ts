import { test, expect } from '@playwright/test';

import { SKU_DISPLAY_NAMES, SKU_PRICES } from '../support/constants';
import { postSignedCheckoutSessionCompleted } from '../support/stripe-webhook';
import { createTestEmail, waitForTestmailMessage } from '../support/testmail';
import {
  runAuditForm,
  goToSelectFromResults,
  selectSkuAndProceedToStripe,
  fillAndSubmitStripeCard,
} from './support/flow-steps';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * J1.T1.4 — Stripe Checkout → Confirmation.
 * Complete payment with a Stripe test card and verify the confirmation
 * page, plus the Stripe receipt and Loops payment-confirmation emails.
 * Uses the same test-mode-checkout + synthetic-webhook technique as
 * e2e/journey-b.full-checkout-confirmation.spec.ts (real payment, no
 * `stripe listen` process dependency) rather than duplicating that spec.
 */
test('checkout completes and confirmation page + receipt/payment emails arrive', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180_000);

  const testEmail = createTestEmail('bs-e2e-t1-4');
  await runAuditForm(page, { email: testEmail.email });
  const { auditLeadId, skus } = await goToSelectFromResults(page);
  const sku = skus[0];

  await selectSkuAndProceedToStripe(page, sku);
  await fillAndSubmitStripeCard(page, testEmail.email);

  const localConfirmationUrl = new RegExp(
    `^${escapeRegExp(baseURL!)}/book-service/confirmation\\?orderId=`
  );
  await expect(page).toHaveURL(localConfirmationUrl, { timeout: 30_000 });

  const orderId = new URL(page.url()).searchParams.get('orderId');
  expect(orderId).toBeTruthy();

  const webhookResponse = await postSignedCheckoutSessionCompleted(baseURL!, {
    orderId: orderId!,
    auditLeadId,
    sku,
    normalizedEmail: '',
    customerEmail: testEmail.email,
  });
  expect(webhookResponse.status).toBe(200);

  // Confirmation page polls order-status with backoff until it sees the
  // order our synthetic webhook just wrote.
  await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(`Order ID: #${orderId}`)).toBeVisible();
  await expect(page.getByText(`Plan: ${SKU_DISPLAY_NAMES[sku]}`)).toBeVisible();

  const signupCta = page.getByRole('button', { name: 'Continue' });
  await expect(signupCta).toBeVisible();

  const [stripeReceipt, loopsPaymentConfirmed] = await Promise.all([
    waitForTestmailMessage(testEmail.tag, {
      subjectMatch: /your receipt from|receipt/i,
      timeoutMs: 60_000,
    }),
    waitForTestmailMessage(testEmail.tag, {
      subjectMatch: /payment|confirm/i,
      timeoutMs: 60_000,
    }),
  ]);

  // Receipt content is Stripe Dashboard product-catalog config, not app
  // code — check the charge amount (reliably present) rather than the SKU
  // display name (not guaranteed to match the configured product name).
  const expectedPrice = SKU_PRICES[sku];
  const receiptBody = stripeReceipt.text + stripeReceipt.html;
  expect(receiptBody).toMatch(new RegExp(`\\$${expectedPrice}(\\.00)?`));

  expect(loopsPaymentConfirmed.subject).toBeTruthy();

  await signupCta.click();
  await expect(page).toHaveURL(new RegExp(`/book-service/signup\\?orderId=${orderId}`));
});
