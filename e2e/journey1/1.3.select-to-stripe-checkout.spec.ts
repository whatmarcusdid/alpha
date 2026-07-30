import { test, expect } from '@playwright/test';

import { SKU_PRICES } from '../support/constants';
import { createTestEmail } from '../support/testmail';
import {
  runAuditForm,
  goToSelectFromResults,
  selectSkuAndProceedToStripe,
  retrieveStripeCheckoutLineItem,
} from './support/flow-steps';

/**
 * J1.T1.3 — Book Service Select → Stripe Checkout.
 * Verify the selection page hands off to Stripe with the correct SKU and
 * price. Re-runs the real audit + select steps (Tests 1.1/1.2's
 * precondition) since each test is its own independent spec file.
 */
test('select page hands off to Stripe Checkout with correct SKU and price', async ({
  page,
}) => {
  test.setTimeout(150_000);

  const testEmail = createTestEmail('bs-e2e-t1-3');
  await runAuditForm(page, { email: testEmail.email });
  const { skus } = await goToSelectFromResults(page);

  // Force Speed Fix to be selectable regardless of which pillars failed, so
  // this test exercises a fixed, known SKU/price pair.
  const sku = skus.includes('speed_fix') ? 'speed_fix' : skus[0];
  if (!skus.includes('speed_fix')) {
    const url = new URL(page.url());
    url.searchParams.set('skus', [...skus, 'speed_fix'].join(','));
    await page.goto(`${url.pathname}${url.search}`);
  }

  await selectSkuAndProceedToStripe(page, sku);

  // Redirected to a Stripe Checkout URL for the selected SKU/price.
  expect(page.url()).toMatch(/^https:\/\/checkout\.stripe\.com\//);

  const lineItem = await retrieveStripeCheckoutLineItem(page.url());
  const expectedPrice = SKU_PRICES[sku];
  expect(expectedPrice).not.toBeNull();
  expect(lineItem.unitAmount).toBe((expectedPrice as number) * 100);
  expect(lineItem.quantity).toBe(1);
  expect(lineItem.productName).toBeTruthy();
});
