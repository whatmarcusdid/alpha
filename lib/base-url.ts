/**
 * Single source of truth for the app's public base URL.
 *
 * Feeds Stripe checkout/portal redirects, transactional email links, and
 * PDF report links — all customer-facing. Resolution order:
 *   1. NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_BASE_URL, if set and well-formed
 *      (a value missing only its protocol, e.g. "my.bookservice.tech", is
 *      normalized to "https://my.bookservice.tech" rather than discarded)
 *   2. A hardcoded default, only when the env var is unset or unusable even
 *      after normalization — https://my.bookservice.tech in production,
 *      http://localhost:3000 in development. The dev/prod split is a
 *      deliberate departure from a single hardcoded default: without it,
 *      every local Stripe test-mode checkout and Playwright spec in this
 *      repo would redirect out to the live domain instead of back to the
 *      dev server.
 * Every fallback path (unset, malformed) logs a warning — this never fails
 * silently, per Finding #15.
 *
 * lib/book-service/validate-base-url.ts (Finding #12) is a separate,
 * complementary check on the 4 Book Service call sites that already used
 * it — it does a live HTTP reachability check this utility doesn't attempt
 * (format validation here is synchronous and local). Kept, not merged.
 */

const PRODUCTION_DEFAULT_BASE_URL = 'https://my.bookservice.tech';
const DEV_DEFAULT_BASE_URL = 'http://localhost:3000';

function normalizeUrl(raw: string): string | null {
  try {
    new URL(raw);
    return raw;
  } catch {
    // Retry assuming a missing protocol before giving up.
  }

  try {
    const withProtocol = `https://${raw}`;
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return null;
  }
}

export function getAppBaseUrl(): string {
  const isDev = process.env.NODE_ENV === 'development';
  const defaultUrl = isDev ? DEV_DEFAULT_BASE_URL : PRODUCTION_DEFAULT_BASE_URL;
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;

  if (!configured) {
    console.warn(
      `[base-url] NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL is not set — falling back to ${defaultUrl}`
    );
    return defaultUrl;
  }

  const normalized = normalizeUrl(configured);

  if (!normalized) {
    console.warn(
      `[base-url] NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL is not a usable URL ("${configured}") — falling back to ${defaultUrl}`
    );
    return defaultUrl;
  }

  if (normalized !== configured) {
    console.warn(
      `[base-url] NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL is missing a protocol ("${configured}") — using "${normalized}"`
    );
  }

  return normalized;
}
