import { test, expect } from '@playwright/test';

import { createTestEmail, waitForTestmailMessage } from '../support/testmail';

/**
 * J1.T1.1 — Public Audit Happy Path.
 * Verify a new visitor can run a full /audit and see Speed/Security/SEO
 * results with a working CTA, plus receive the Loops audit PDF email.
 */
test('public audit happy path', async ({ page }) => {
  test.setTimeout(150_000);

  const testEmail = createTestEmail('bs-e2e-t1-1');

  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/audit');

  // Book Service branding + audit form visible.
  await expect(page.getByRole('navigation', { name: 'Book Service' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Is your website helping or hurting your business?' })
  ).toBeVisible();
  await expect(page.getByLabel('First name')).toBeVisible();
  await expect(page.getByLabel('Business name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Website URL')).toBeVisible();

  await page.getByLabel('First name').fill('QA');
  await page.getByLabel('Business name').fill('Book Service E2E');
  await page.getByLabel('Email address').fill(testEmail.email);
  await page.getByLabel('Website URL').fill('https://example.com');
  await page.getByRole('button', { name: 'Run My Free Audit' }).click();

  const loadingHeading = page.getByRole('heading', { name: 'Analyzing your site…' });
  await expect(loadingHeading).toBeVisible();

  // Three pillar cards visible in loading mode.
  await expect(page.getByText('Speed', { exact: true })).toBeVisible();
  await expect(page.getByText('Security', { exact: true })).toBeVisible();
  await expect(page.getByText('SEO & AI Visibility', { exact: true })).toBeVisible();

  // Real audit pipeline (PageSpeed + security + SEO + Gemini narratives) —
  // the app's own copy says "up to 60 seconds", so give real headroom.
  await expect(loadingHeading).toBeHidden({ timeout: 90_000 });

  // Each pillar's grade descriptor is unique to the results view — three
  // matches proves all three pillars rendered with a letter grade or N/A.
  const descriptorPattern =
    /Score: \d+\/100|Score unavailable|\d+ flags? found|Site is flagged as unsafe|Scan unavailable|\d+\/9 checks passed/;
  await expect(page.getByText(descriptorPattern)).toHaveCount(3);

  // Narratives render as non-empty text under each pillar heading.
  for (const heading of ['Speed', 'Security', 'SEO & AI Visibility']) {
    const pillarHeading = page.getByRole('heading', { name: heading, level: 2 });
    await expect(pillarHeading).toBeVisible();
    const narrative = pillarHeading.locator('xpath=following-sibling::p[1]');
    const narrativeText = await narrative.textContent();
    expect(narrativeText?.trim().length ?? 0).toBeGreaterThan(0);
  }

  const viewFixesButton = page.getByRole('button', { name: 'View my site fixes' });
  await expect(viewFixesButton).toBeEnabled({ timeout: 15_000 });

  // No JS errors blocking render — CTA present and clickable is asserted
  // above; also confirm no uncaught page error was recorded during the run.
  expect(pageErrors).toHaveLength(0);

  const message = await waitForTestmailMessage(testEmail.tag, {
    subjectMatch: /audit/i,
    timeoutMs: 60_000,
  });
  expect(message.attachments.length + (/report|dashboard|pdf/i.test(message.html) ? 1 : 0)).toBeGreaterThan(
    0
  );
});
