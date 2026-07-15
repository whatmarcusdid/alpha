/**
 * Log-only safety net for the Book Service checkout base URL.
 *
 * NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL feed Stripe checkout
 * success_url/cancel_url and transactional email links across
 * checkout/create-account/dashboard-invite/handleSiteFixPayment. If that
 * value is malformed or unreachable, customers land on a dead page after
 * paying. This never blocks or throws — it only warns.
 *
 * Does not touch the (currently duplicated) getAppBaseUrl() implementations
 * themselves — see Finding #12 in the Client smoke test Notion doc for the
 * broader fragmentation (9 files, 3 different fallback behaviors) that's
 * out of scope for this check.
 */

let checked = false;

export function warnIfBaseUrlLooksWrong(): void {
  if (checked) return;
  checked = true;

  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (!raw) return; // Falling back to localhost is expected in dev — nothing to warn about.

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.warn(
      `[book-service] NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL is not a valid URL: "${raw}". Checkout redirects and email links will be broken.`
    );
    return;
  }

  // Fire-and-forget — never awaited by callers, never blocks a cold start.
  void fetch(url.origin, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
    .then((res) => {
      if (!res.ok) {
        console.warn(
          `[book-service] Base URL ${url.origin} responded with HTTP ${res.status} — checkout redirects and email links may point customers at a dead page.`
        );
      }
    })
    .catch((err: unknown) => {
      console.warn(
        `[book-service] Base URL ${url.origin} is unreachable (${err instanceof Error ? err.message : 'unknown error'}) — checkout redirects and email links may point customers at a dead page.`
      );
    });
}
