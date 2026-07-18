import type Stripe from 'stripe';

import { normalizeEmail } from '@/lib/stripe/authenticated-email';

function firstNormalizedEmail(
  candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return normalizeEmail(candidate);
    }
  }

  return null;
}

export function extractCheckoutSessionEmail(
  session: Stripe.Checkout.Session
): string | null {
  const expandedCustomer =
    typeof session.customer === 'object' &&
    session.customer &&
    !('deleted' in session.customer && session.customer.deleted)
      ? session.customer
      : null;

  return firstNormalizedEmail([
    session.customer_details?.email,
    session.customer_email,
    session.metadata?.normalizedEmail,
    expandedCustomer?.email,
  ]);
}

export async function extractPaymentIntentEmail(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<string | null> {
  const directEmail = firstNormalizedEmail([
    paymentIntent.receipt_email,
    paymentIntent.metadata?.normalizedEmail,
  ]);

  if (directEmail) {
    return directEmail;
  }

  const customerId =
    typeof paymentIntent.customer === 'string'
      ? paymentIntent.customer
      : paymentIntent.customer?.id;

  if (!customerId) {
    return null;
  }

  const customer = await stripe.customers.retrieve(customerId);
  if ('deleted' in customer && customer.deleted) {
    return null;
  }

  return firstNormalizedEmail([customer.email]);
}
