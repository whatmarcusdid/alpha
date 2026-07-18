/**
 * Stripe substitutes `{CHECKOUT_SESSION_ID}` on redirect after payment.
 * The confirmation page uses that session id to resolve the checkout email
 * server-side (customer_details.email), avoiding sessionStorage loss across
 * the checkout.stripe.com redirect.
 */
export function buildBookServiceConfirmationSuccessUrl(
  baseUrl: string,
  orderId: string,
  normalizedEmail?: string
): string {
  const emailSuffix = normalizedEmail
    ? `&email=${encodeURIComponent(normalizedEmail)}`
    : '';

  // Do not URL-encode the Stripe template token — Stripe matches the literal
  // `{CHECKOUT_SESSION_ID}` string when substituting on redirect.
  return `${baseUrl}/book-service/confirmation?orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}${emailSuffix}`;
}
