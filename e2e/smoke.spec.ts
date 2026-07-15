import { test, expect } from '@playwright/test';

/**
 * Toolchain smoke test — confirms webServer auto-boot, baseURL, and a
 * real browser launch all work before any real spec depends on them.
 */
test('audit page loads and the submit button is visible', async ({ page }) => {
  await page.goto('/audit');
  await expect(page.getByRole('button', { name: 'Run My Free Audit' })).toBeVisible();
});
