import { expect, type Page } from '@playwright/test';

/**
 * Logs in an existing Book Service customer via the real /signin form (not
 * the Admin SDK) — mirrors signInAdminViaUi in admin-auth.ts but without the
 * hardcoded /dashboard destination, since callers may arrive via a
 * `?redirect=` target other than the dashboard.
 */
export async function loginAs(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  const sessionRequest = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/session') &&
      response.request().method() === 'POST' &&
      response.ok()
  );

  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: 'Signing in…' })).toHaveCount(0);
  await sessionRequest;
}
