export type BookServiceAnalyticsEvent =
  | 'site_fix_offer_viewed'
  | 'site_fix_sku_selected'
  | 'site_fix_checkout_started'
  | 'site_fix_payment_succeeded'
  | 'site_fix_confirmation_loaded';

export function trackBookServiceEvent(
  event: BookServiceAnalyticsEvent,
  properties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  fetch('/api/book-service/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {});
}
