import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import Stripe from 'stripe';

import { AUDIT_LEAD_ID_STORAGE_KEY, SKU_DISPLAY_NAMES } from './constants';
import type { SiteFixSKU } from './seed';

const ALL_SKUS =
  'speed_fix,security_fix,seo_ai_visibility_fix,full_bundle' as const;

export type AuditCheckoutContext = {
  auditLeadId: string;
  sku: SiteFixSKU;
  checkoutEmail: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function runAuditToStripeCheckout(
  page: Page,
  sku: SiteFixSKU
): Promise<AuditCheckoutContext> {
  const checkoutEmail = `bs-e2e-s5-${Date.now()}@example.com`;

  await page.goto('/audit');
  await page.getByLabel('First name').fill('QA');
  await page.getByLabel('Business name').fill('Book Service S5 E2E');
  await page.getByLabel('Email address').fill(`bs-e2e-audit-${Date.now()}@example.com`);
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

  // Ensure target SKU is selectable regardless of audit-recommended subset.
  await page.goto(
    `/book-service/select?skus=${ALL_SKUS}${page.url().includes('email=') ? `&${page.url().split('?')[1]?.split('&').find((p) => p.startsWith('email=')) ?? ''}` : ''}`
  );

  const displayName = SKU_DISPLAY_NAMES[sku];
  const card = page.locator('article', { hasText: displayName });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.getByRole('button', { name: 'Select' }).click();

  await expect(page).toHaveURL(new RegExp(`/book-service/select/${sku}\\?`));
  await page.getByRole('button', { name: 'Proceed To Checkout' }).click();

  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Payment method' })).toBeVisible();

  await page.evaluate(
    ({ email, key }) => sessionStorage.setItem(key, email),
    { email: checkoutEmail, key: 'book-service:checkoutEmail' }
  );
  await page.getByPlaceholder('email@example.com').fill(checkoutEmail);

  return { auditLeadId: auditLeadId!, sku, checkoutEmail };
}

export async function selectCardPaymentMethod(page: Page): Promise<void> {
  const cardRadio = page.getByRole('radio', { name: 'Card', exact: true });
  if (await cardRadio.count()) {
    await cardRadio.click({ force: true });
  }
}

export async function fillStripeCardDetails(
  page: Page,
  cardNumber: string
): Promise<void> {
  await selectCardPaymentMethod(page);
  await page.getByPlaceholder('1234 1234 1234 1234').fill(cardNumber);
  await page.getByPlaceholder('MM / YY').fill('12/34');
  await page.getByPlaceholder('CVC').fill('123');
  await page.getByPlaceholder('Full name on card').fill('QA Test');
  await page.getByPlaceholder('ZIP').fill('94103');

  const phoneField = page.getByPlaceholder('(201) 555-0123');
  if (await phoneField.isVisible().catch(() => false)) {
    await phoneField.fill('2015550123');
  }
}

export async function submitStripeCheckout(page: Page): Promise<void> {
  await page.locator('button[type="submit"]').click();
}

export function extractStripeSessionId(checkoutUrl: string): string {
  const match = checkoutUrl.match(/(cs_test_[a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error(`No Stripe session id in URL: ${checkoutUrl}`);
  }
  return match[1];
}

export async function getOrderIdFromStripeCheckoutUrl(
  checkoutUrl: string
): Promise<string> {
  const sessionId = extractStripeSessionId(checkoutUrl);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2025-12-15.clover',
  });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    throw new Error(`Stripe session ${sessionId} missing metadata.orderId`);
  }
  return orderId;
}

async function safeLocatorCount(
  locator: ReturnType<Page['getByRole']>
): Promise<number> {
  try {
    return await locator.count();
  } catch {
    return 0;
  }
}

async function click3dsOutcomeButton(
  target: Page,
  outcome: 'success' | 'fail'
): Promise<boolean> {
  const patterns =
    outcome === 'success'
      ? [/Complete authentication/i, /Authorize Test Payment/i, /^Complete$/i]
      : [/Fail authentication/i, /Fail Test Payment/i, /^Fail$/i];

  for (const pattern of patterns) {
    const button = target.getByRole('button', { name: pattern });
    if (await safeLocatorCount(button)) {
      await button.first().click();
      return true;
    }
  }

  return false;
}

export async function completeStripe3dsChallenge(
  page: Page,
  outcome: 'success' | 'fail',
  baseURL?: string
): Promise<void> {
  const confirmationPattern = baseURL
    ? localConfirmationUrlPattern(baseURL)
    : /\/book-service\/confirmation\?orderId=/;

  const popupPromise = page
    .waitForEvent('popup', { timeout: 45_000 })
    .catch(() => null);

  await Promise.race([
    page.waitForURL(confirmationPattern, { timeout: 45_000 }).catch(() => null),
    page
      .waitForURL(/authenticate|challenge|3ds|hooks\.stripe/i, { timeout: 45_000 })
      .catch(() => null),
    popupPromise,
    page.waitForTimeout(5_000),
  ]);

  if (confirmationPattern.test(page.url())) {
    return;
  }

  const popup = await popupPromise;
  const targets = popup ? [popup, page] : [page];
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    for (const target of targets) {
      if (await click3dsOutcomeButton(target, outcome)) {
        if (popup) {
          await popup.waitForEvent('close', { timeout: 30_000 }).catch(() => null);
        }
        return;
      }

      for (const frame of target.frames()) {
        try {
          for (const pattern of [
            outcome === 'success'
              ? /Complete authentication|Authorize Test Payment|^Complete$/i
              : /Fail authentication|Fail Test Payment|^Fail$/i,
          ]) {
            const button = frame.getByRole('button', { name: pattern });
            if (await safeLocatorCount(button)) {
              await button.first().click();
              return;
            }
          }
        } catch {
          // Frame may detach while Stripe transitions between challenge steps.
        }
      }
    }

    if (confirmationPattern.test(page.url())) {
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for 3DS ${outcome} challenge UI`);
}

export function localConfirmationUrlPattern(baseURL: string): RegExp {
  return new RegExp(
    `^${escapeRegExp(baseURL)}/book-service/confirmation\\?orderId=`
  );
}
