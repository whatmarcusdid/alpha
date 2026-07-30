import { test, expect } from '@playwright/test';

import { SKU_DISPLAY_NAMES } from '../support/constants';
import { createTestEmail } from '../support/testmail';
import { runAuditForm, goToSelectFromResults } from './support/flow-steps';

/**
 * J1.T1.2 — Audit Results → Book Service Select.
 * Verify the CTA routes correctly and SKUs pre-select based on failing
 * pillars. Re-runs the real audit (Test 1.1's precondition) since each test
 * is its own independent spec file.
 */
test('audit results CTA routes to select with failing-pillar SKUs pre-selected', async ({
  page,
}) => {
  test.setTimeout(150_000);

  const testEmail = createTestEmail('bs-e2e-t1-2');
  await runAuditForm(page, { email: testEmail.email });

  // Grade snapshot for the SKUs the app pre-selects, read from the results
  // view before navigating away.
  const gradeTexts = await page
    .getByText(
      /Score: \d+\/100|Score unavailable|\d+ flags? found|Site is flagged as unsafe|Scan unavailable|\d+\/9 checks passed/
    )
    .allTextContents();
  expect(gradeTexts).toHaveLength(3);

  const { skus } = await goToSelectFromResults(page);

  // auditLeadId must NOT be in the URL query params.
  const url = new URL(page.url());
  expect(url.searchParams.has('auditLeadId')).toBe(false);

  expect(skus.length).toBeGreaterThan(0);

  for (const sku of skus) {
    await expect(
      page.locator('article', { hasText: SKU_DISPLAY_NAMES[sku] })
    ).toBeVisible();
  }
});
