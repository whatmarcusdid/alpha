import { test, expect } from '@playwright/test';

import { AUDIT_LEAD_ID_STORAGE_KEY, SKU_DISPLAY_NAMES } from './support/constants';

/**
 * Journey A+B: Audit -> Package Select -> Checkout, stopping short of real
 * payment. Hits the real audit-scanning backend (PageSpeed/security/SEO +
 * Gemini narratives), so the first assertion window is generous (up to 90s
 * per the app's own "up to 60 seconds" loading copy). Grades are asserted
 * structurally, not on specific letters/scores, since those depend on live
 * third-party checks against the test URL.
 */
test.describe('audit to checkout', () => {
  test('audit form -> results -> package select -> Stripe checkout redirect', async ({ page }) => {
    await page.goto('/audit');

    await page.getByLabel('First name').fill('QA');
    await page.getByLabel('Business name').fill('Book Service E2E');
    await page.getByLabel('Email address').fill(`bs-e2e-${Date.now()}@example.com`);
    await page.getByLabel('Website URL').fill('https://example.com');
    await page.getByRole('button', { name: 'Run My Free Audit' }).click();

    const loadingHeading = page.getByRole('heading', { name: 'Analyzing your site…' });
    await expect(loadingHeading).toBeVisible();

    // Real audit pipeline (PageSpeed + security + SEO + Gemini narratives) —
    // the app's own copy says "up to 60 seconds", so give real headroom.
    // "Speed"/"Security"/"SEO & AI Visibility" text also appears in the
    // loading animation, so wait for it to be replaced by the results view
    // before asserting on pillar content.
    await expect(loadingHeading).toBeHidden({ timeout: 90_000 });

    // Each pillar's grade-card descriptor is unique to the results view —
    // three matches proves all three pillars rendered.
    const descriptorPattern =
      /Score: \d+\/100|Score unavailable|\d+ flags? found|Site is flagged as unsafe|Scan unavailable|\d+\/9 checks passed/;
    await expect(page.getByText(descriptorPattern)).toHaveCount(3);

    const viewFixesButton = page.getByRole('button', { name: 'View my site fixes' });
    await expect(viewFixesButton).toBeEnabled({ timeout: 15_000 });
    await viewFixesButton.click();

    await expect(page).toHaveURL(/\/book-service\/select\?skus=/);

    const storedAuditLeadId = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      AUDIT_LEAD_ID_STORAGE_KEY
    );
    expect(storedAuditLeadId).toBeTruthy();

    const url = new URL(page.url());
    const skus = (url.searchParams.get('skus') ?? '')
      .split(',')
      .filter((sku): sku is keyof typeof SKU_DISPLAY_NAMES => sku in SKU_DISPLAY_NAMES);
    expect(skus.length).toBeGreaterThan(0);

    const firstSku = skus[0];
    const displayName = SKU_DISPLAY_NAMES[firstSku];
    const card = page.locator('article', { hasText: displayName });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Select' }).click();

    await expect(page).toHaveURL(new RegExp(`/book-service/select/${firstSku}\\?`));
    await page.getByRole('button', { name: 'Proceed To Checkout' }).click();

    // Real checkout API call + real Stripe test-mode session creation —
    // stop at the redirect, don't enter card details in this spec.
    await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 20_000 });
  });

  test('shows the session-expired modal when there is no audit session', async ({ page }) => {
    await page.goto('/book-service/select');

    const dialog = page.getByRole('dialog', { name: 'Session expired' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Session expired' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Back to audit results' })).toBeVisible();
  });
});
