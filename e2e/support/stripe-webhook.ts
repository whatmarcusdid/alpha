// Node-side helper (runs in the Playwright test process, not the browser) that
// signs and POSTs a synthetic checkout.session.completed event to the real
// webhook route. Same signing technique as app/api/webhooks/stripe/__tests__/
// route.test.ts (Stripe's own generateTestHeaderString — pure HMAC, no network
// call) so this doesn't depend on `stripe listen` running as a second process.

import Stripe from 'stripe';

export type SiteFixWebhookMetadata = {
  orderId: string;
  auditLeadId: string;
  sku: string;
  normalizedEmail: string;
  /** Stripe checkout customer_details.email — preferred over metadata when set */
  customerEmail?: string;
};

export async function postSignedCheckoutSessionCompleted(
  baseURL: string,
  metadata: SiteFixWebhookMetadata
): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set in the Playwright test-runner process ' +
        '— check playwright.config.ts loads .env.local before tests run.'
    );
  }

  const customerEmail = metadata.customerEmail?.trim();
  const sessionObject: Record<string, unknown> = {
    id: `cs_e2e_${Date.now()}`,
    object: 'checkout.session',
    payment_intent: `pi_e2e_${Date.now()}`,
    metadata: {
      productType: 'site_fix',
      orderId: metadata.orderId,
      auditLeadId: metadata.auditLeadId,
      sku: metadata.sku,
      normalizedEmail: metadata.normalizedEmail,
    },
  };

  if (customerEmail) {
    sessionObject.customer_details = { email: customerEmail };
  }

  const payload = JSON.stringify({
    id: `evt_e2e_${Date.now()}`,
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2025-12-15.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: sessionObject,
    },
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2025-12-15.clover',
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

  return fetch(`${baseURL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'Content-Type': 'application/json',
    },
    body: payload,
  });
}
