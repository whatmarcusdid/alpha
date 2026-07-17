import { expect, type Page } from '@playwright/test';

const AUTH_EMULATOR_CONSOLE_PATTERN =
  /You are using the Auth Emulator/i;

const PREFLIGHT_TIMEOUT_MS = 5_000;

const PREFLIGHT_FAILURE_MESSAGE =
  'Browser Firebase client is not connected to the Auth Emulator. ' +
  'Stop any stray `npm run dev` on port 3000 and run e2e via `npm run test:e2e` ' +
  'so Playwright spawns its own server with NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true. ' +
  'Also ensure `firebase emulators:start` is running (Auth on 9099). ' +
  'Do not opt into server reuse unless debugging: PLAYWRIGHT_REUSE_DEV_SERVER=true.';

/**
 * Fail fast when the browser-side Firebase SDK is not wired to the Auth Emulator.
 *
 * create-account uses Admin SDK against the emulator (via FIREBASE_AUTH_EMULATOR_HOST
 * in .env.local), but signInWithCustomToken runs in the browser — if
 * NEXT_PUBLIC_USE_FIREBASE_EMULATOR is missing, signup flows stall on
 * /book-service/signup instead of redirecting to confirm-details.
 */
export async function requireBrowserAuthEmulator(page: Page): Promise<void> {
  let emulatorWarningSeen = false;

  const onConsole = (msg: { text: () => string }) => {
    if (AUTH_EMULATOR_CONSOLE_PATTERN.test(msg.text())) {
      emulatorWarningSeen = true;
    }
  };

  page.on('console', onConsole);

  try {
    // Any route that loads lib/firebase.ts in the browser is sufficient.
    await page.goto('/audit', { waitUntil: 'domcontentloaded' });

    await expect
      .poll(() => emulatorWarningSeen, {
        message: PREFLIGHT_FAILURE_MESSAGE,
        timeout: PREFLIGHT_TIMEOUT_MS,
      })
      .toBe(true);
  } finally {
    page.off('console', onConsole);
  }
}
