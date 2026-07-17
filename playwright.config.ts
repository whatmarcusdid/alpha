import { defineConfig, devices } from '@playwright/test';

import { loadDotEnvFile } from './lib/fix-jobs/seed-fix-job-utils';

// The Playwright test runner is a separate Node process from `next dev` (which
// loads .env.local itself) — load it here too so specs that sign synthetic
// Stripe webhook events (e2e/support/stripe-webhook.ts) see the same
// STRIPE_WEBHOOK_SECRET the running server verifies against.
loadDotEnvFile('.env.local');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  // Journey specs hit real, slow external services (PageSpeed/security/SEO
  // scans, Gemini narratives, live Stripe test-mode checkout) — the default
  // 30s per-test timeout isn't enough headroom for those.
  timeout: 120_000,
  // The Upstash rate limiter's REST endpoint doesn't resolve in this
  // environment (DNS ENOTFOUND) — every rate-limited API route fails open
  // but only after that lookup times out, adding real latency to otherwise-
  // fast flows (e.g. Journey C). Give assertions more room than the 5s
  // default rather than hand-tuning every one.
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // Always spawn a fresh server so webServer.env overrides apply. Reusing a
    // leftover `npm run dev` silently keeps .env.local's production
    // NEXT_PUBLIC_BASE_URL — Stripe success_url then redirects to a dead prod
    // page and Journey B times out on "Order Summary" (see journey-b spec).
    // Opt in to reuse only when debugging: PLAYWRIGHT_REUSE_DEV_SERVER=true.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_DEV_SERVER === 'true',
    timeout: 60_000,
    // .env.local's NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL point at the real
    // production domain (used elsewhere for Stripe CLI forwarding setups) —
    // override just for the spawned test server so Stripe's checkout
    // success_url/cancel_url redirect back to this local server, not prod.
    env: {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      // Routes the browser-side Firebase SDK (lib/firebase.ts) to the
      // Firebase Emulator Suite instead of the real project — required for
      // Journey C (signup -> confirm-details -> access), which needs a
      // genuine ID token. Off by default outside Playwright runs.
      NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
      // .env.local has no SITE_FIX_ENCRYPTION_KEY at all (only .env.example's
      // PLACEHOLDER exists) — /api/book-service/submit-access throws without
      // it, so access-credential encryption is untestable, and un-runnable
      // in real dev, without a real key. Test-only 32-byte base64 key so
      // Journey C can exercise the real AES-256-GCM encryption path.
      SITE_FIX_ENCRYPTION_KEY: 'xYnIPgzH2OCBkNgZz3MnPI4SP4qjVr5wp26lOdRnqFE=',
    },
  },
});
