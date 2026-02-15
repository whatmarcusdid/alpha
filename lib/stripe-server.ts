import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get shared Stripe instance for server-side use
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }
  return stripeInstance;
}

/**
 * Create a Stripe customer portal session and return the URL
 * @param customerId - Stripe customer ID
 * @param returnUrl - URL to redirect to after portal session (defaults to app URL)
 * @returns Portal session URL
 */
export async function getStripeCustomerPortalUrl(
  customerId: string,
  returnUrl?: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url:
      returnUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://app.tradesitegenie.com',
  });

  return session.url;
}
