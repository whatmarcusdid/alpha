import { test, expect } from '@playwright/test';

import {
  completeStripe3dsChallenge,
  fillStripeCardDetails,
  getOrderIdFromStripeCheckoutUrl,
  localConfirmationUrlPattern,
  runAuditToStripeCheckout,
  submitStripeCheckout,
} from './support/checkout-flow';
import {
  countPaidOrders,
  getOrderFirestoreState,
} from './support/firestore-order-state';
import { postSignedCheckoutSessionCompleted } from './support/stripe-webhook';

/**
 * Section 5 — Stripe failure-path verification (declined card, 3DS, abandonment).
 * Requires Firebase Emulator Suite + STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET in .env.local.
 * Runs serially; each scenario starts a fresh audit → checkout flow.
 */
test.describe.serial('Section 5 — Stripe payment failure paths', () => {
  test.describe.configure({ timeout: 180_000 });

  test('5.1 — declined card (4000...0002)', async ({ page }) => {
    const paidBefore = await countPaidOrders();
    const ctx = await runAuditToStripeCheckout(page, 'speed_fix');
    const orderId = await getOrderIdFromStripeCheckoutUrl(page.url());

    await fillStripeCardDetails(page, '4000000000000002');
    await submitStripeCheckout(page);

    await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//, {
      timeout: 20_000,
    });
    await expect(page.getByText(/declined|card has been declined|payment failed/i)).toBeVisible({
      timeout: 20_000,
    });

    const firestore = await getOrderFirestoreState(orderId);
    expect(firestore.orderExists).toBe(false);
    expect(firestore.pendingOrderExists).toBe(false);
    expect(await countPaidOrders()).toBe(paidBefore);
  });

  test('5.2 — 3DS success (4000...3184)', async ({ page, baseURL }) => {
    const ctx = await runAuditToStripeCheckout(page, 'security_fix');

    await fillStripeCardDetails(page, '4000002760003184');
    await submitStripeCheckout(page);
    await completeStripe3dsChallenge(page, 'success', baseURL!);

    await expect(page).toHaveURL(localConfirmationUrlPattern(baseURL!), {
      timeout: 45_000,
    });

    await expect(
      page.getByRole('heading', { name: 'Confirm your email to view your order' })
    ).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('session_id')).toBeTruthy();

    const orderId = new URL(page.url()).searchParams.get('orderId');
    expect(orderId).toBeTruthy();

    const webhookResponse = await postSignedCheckoutSessionCompleted(baseURL!, {
      orderId: orderId!,
      auditLeadId: ctx.auditLeadId,
      sku: ctx.sku,
      normalizedEmail: '',
      customerEmail: ctx.checkoutEmail,
    });
    expect(webhookResponse.status).toBe(200);

    await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible({
      timeout: 30_000,
    });

    const firestore = await getOrderFirestoreState(orderId!);
    expect(firestore.orderExists).toBe(true);
    expect(firestore.orderStatus).toBe('paid');
    expect(firestore.pendingOrderExists).toBe(true);
    expect(firestore.pendingClaimState).toBe('unclaimed');
  });

  test('5.3 — 3DS failed authentication (4000...3178)', async ({ page, baseURL }) => {
    const paidBefore = await countPaidOrders();
    const ctx = await runAuditToStripeCheckout(page, 'speed_fix');
    const orderId = await getOrderIdFromStripeCheckoutUrl(page.url());

    await fillStripeCardDetails(page, '4000008260003178');
    await submitStripeCheckout(page);
    await completeStripe3dsChallenge(page, 'fail', baseURL!);

    const stillOnStripe = page.url().startsWith('https://checkout.stripe.com/');
    const redirectedLocally =
      page.url().startsWith(baseURL!) &&
      !page.url().includes('/book-service/confirmation');

    expect(stillOnStripe || redirectedLocally).toBe(true);

    if (stillOnStripe) {
      await expect(
        page.getByText(/unable to authenticate|authentication failed|payment failed|could not be authenticated|declined/i)
      ).toBeVisible({ timeout: 20_000 });
    }

    const firestore = await getOrderFirestoreState(orderId);
    expect(firestore.orderExists).toBe(false);
    expect(firestore.orderStatus).not.toBe('paid');
    expect(await countPaidOrders()).toBe(paidBefore);
  });

  test('5.4 — abandonment before payment', async ({ page, baseURL }) => {
    const paidBefore = await countPaidOrders();
    await runAuditToStripeCheckout(page, 'speed_fix');
    const orderId = await getOrderIdFromStripeCheckoutUrl(page.url());

    await page.goto(`${baseURL}/audit`);

    const firestore = await getOrderFirestoreState(orderId);
    expect(firestore.orderExists).toBe(false);
    expect(firestore.orderStatus).not.toBe('paid');
    expect(firestore.pendingOrderExists).toBe(false);
    expect(await countPaidOrders()).toBe(paidBefore);
  });

  test('5.5 — Full Bundle happy-path via real checkout (Section 3.3 gap)', async ({
    page,
    baseURL,
  }) => {
    const ctx = await runAuditToStripeCheckout(page, 'full_bundle');

    await fillStripeCardDetails(page, '4242424242424242');
    await submitStripeCheckout(page);

    await expect(page).toHaveURL(localConfirmationUrlPattern(baseURL!), {
      timeout: 45_000,
    });

    await expect(
      page.getByRole('heading', { name: 'Confirm your email to view your order' })
    ).toHaveCount(0);

    const orderId = new URL(page.url()).searchParams.get('orderId');
    expect(orderId).toBeTruthy();

    const webhookResponse = await postSignedCheckoutSessionCompleted(baseURL!, {
      orderId: orderId!,
      auditLeadId: ctx.auditLeadId,
      sku: ctx.sku,
      normalizedEmail: '',
      customerEmail: ctx.checkoutEmail,
    });
    expect(webhookResponse.status).toBe(200);

    await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Full Bundle|full bundle/i)).toBeVisible();

    const firestore = await getOrderFirestoreState(orderId!);
    expect(firestore.orderStatus).toBe('paid');
  });
});
