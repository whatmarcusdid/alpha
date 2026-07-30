// Composable UI steps shared across the Journey 1 (1.1-1.9) spec files. Each
// spec is its own file per the test plan, so these are re-run from scratch
// per spec rather than chained across files/browser contexts — kept separate
// from e2e/support/checkout-flow.ts (used by the pre-existing journey-a-b/-b
// specs) so this work doesn't touch already-passing coverage.

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import Stripe from 'stripe';

import { AUDIT_LEAD_ID_STORAGE_KEY, SKU_DISPLAY_NAMES } from '../../support/constants';
import type { SiteFixSKU } from '../../support/seed';

export type AuditFormValues = {
  firstName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
};

/** Test 1.1's steps: fill + submit the audit form, wait through loading to results. */
export async function runAuditForm(
  page: Page,
  values: Partial<AuditFormValues> = {}
): Promise<AuditFormValues> {
  const filled: AuditFormValues = {
    firstName: 'QA',
    businessName: 'Book Service E2E',
    websiteUrl: 'https://example.com',
    email: `bs-e2e-fallback-${Date.now()}@example.com`,
    ...values,
  };

  await page.goto('/audit');

  await page.getByLabel('First name').fill(filled.firstName);
  await page.getByLabel('Business name').fill(filled.businessName);
  await page.getByLabel('Email address').fill(filled.email);
  await page.getByLabel('Website URL').fill(filled.websiteUrl);
  await page.getByRole('button', { name: 'Run My Free Audit' }).click();

  const loadingHeading = page.getByRole('heading', { name: 'Analyzing your site…' });
  await expect(loadingHeading).toBeVisible();
  // Real audit pipeline (PageSpeed + security + SEO + Gemini narratives) —
  // the app's own copy says "up to 60 seconds", so give real headroom.
  await expect(loadingHeading).toBeHidden({ timeout: 90_000 });

  return filled;
}

/** Test 1.2's step: click the results CTA and land on /book-service/select. */
export async function goToSelectFromResults(
  page: Page
): Promise<{ auditLeadId: string; skus: SiteFixSKU[] }> {
  const viewFixesButton = page.getByRole('button', { name: 'View my site fixes' });
  await expect(viewFixesButton).toBeEnabled({ timeout: 15_000 });
  await viewFixesButton.click();

  await expect(page).toHaveURL(/\/book-service\/select\?skus=/);

  const auditLeadId = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    AUDIT_LEAD_ID_STORAGE_KEY
  );
  if (!auditLeadId) {
    throw new Error('goToSelectFromResults: auditLeadId missing from sessionStorage');
  }

  const url = new URL(page.url());
  const skus = (url.searchParams.get('skus') ?? '')
    .split(',')
    .filter((sku): sku is SiteFixSKU => sku in SKU_DISPLAY_NAMES);

  return { auditLeadId, skus };
}

/** Test 1.3's steps: pick a SKU card, proceed, land on Stripe Checkout. */
export async function selectSkuAndProceedToStripe(
  page: Page,
  sku: SiteFixSKU
): Promise<void> {
  const displayName = SKU_DISPLAY_NAMES[sku];
  const card = page.locator('article', { hasText: displayName });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Select' }).click();

  await expect(page).toHaveURL(new RegExp(`/book-service/select/${sku}\\?`));
  await page.getByRole('button', { name: 'Proceed To Checkout' }).click();

  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 20_000 });
}

/** Test 1.4's steps: fill the Stripe test card and submit payment. */
export async function fillAndSubmitStripeCard(
  page: Page,
  checkoutEmail: string
): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Payment method' })).toBeVisible();
  await page.getByPlaceholder('email@example.com').fill(checkoutEmail);

  // "Card" is collapsed by default when multiple payment methods are offered.
  const cardRadio = page.getByRole('radio', { name: 'Card', exact: true });
  if (await cardRadio.count()) {
    await cardRadio.click({ force: true });
  }

  await page.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242');
  await page.getByPlaceholder('MM / YY').fill('12/34');
  await page.getByPlaceholder('CVC').fill('123');
  await page.getByPlaceholder('Full name on card').fill('QA Test');
  await page.getByPlaceholder('ZIP').fill('94103');

  const phoneField = page.getByPlaceholder('(201) 555-0123');
  if (await phoneField.isVisible().catch(() => false)) {
    await phoneField.fill('2015550123');
  }

  await page.locator('button[type="submit"]').click();
}

export function extractStripeSessionId(checkoutUrl: string): string {
  const match = checkoutUrl.match(/(cs_test_[a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error(`No Stripe session id in URL: ${checkoutUrl}`);
  }
  return match[1];
}

/**
 * Test 1.3's price/product check — verified via the Stripe API against the
 * live checkout session rather than scraping checkout.stripe.com's DOM. The
 * hosted page's product/price text reflects the Stripe test-mode Dashboard's
 * Product/Price config, not app code, so this instead confirms the session
 * app code created actually carries the right SKU's price.
 */
export async function retrieveStripeCheckoutLineItem(checkoutUrl: string): Promise<{
  unitAmount: number | null;
  quantity: number | null;
  productName: string | null;
}> {
  const sessionId = extractStripeSessionId(checkoutUrl);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2025-12-15.clover',
  });

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'line_items.data.price.product'],
  });

  const lineItem = session.line_items?.data[0];
  const price = lineItem?.price;
  const product = price?.product;

  return {
    unitAmount: price?.unit_amount ?? null,
    quantity: lineItem?.quantity ?? null,
    productName:
      product && typeof product === 'object' && 'name' in product
        ? (product.name as string)
        : null,
  };
}
