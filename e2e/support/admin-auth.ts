import { expect, type Page } from '@playwright/test';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

const adminAuth = admin.auth();

export type AdminTestCredentials = {
  email: string;
  password: string;
};

/**
 * Creates an Auth Emulator user with `{ admin: true }` before first sign-in so
 * the ID token and session cookie include the admin claim.
 */
export async function createAdminTestUser(): Promise<AdminTestCredentials> {
  const email = `admin-e2e-${Date.now()}@example.com`;
  const password = 'e2e-admin-password-123';

  const user = await adminAuth.createUser({
    email,
    password,
    displayName: 'Admin E2E',
  });

  await adminAuth.setCustomUserClaims(user.uid, { admin: true });

  return { email, password };
}

export async function signInAdminViaUi(
  page: Page,
  credentials: AdminTestCredentials
): Promise<void> {
  await page.goto('/signin');

  await page.getByLabel('Email address').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);

  const sessionRequest = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/session') &&
      response.request().method() === 'POST' &&
      response.ok()
  );

  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await sessionRequest;
}
