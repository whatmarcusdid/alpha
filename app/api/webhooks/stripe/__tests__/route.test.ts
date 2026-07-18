import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression test for the idempotency contract documented at the top of
 * lib/book-service/handleSiteFixPayment.ts: a retried checkout.session.completed
 * webhook for the same orderId must not create a second orders/pending_orders
 * write. Signature verification runs for real (via the real `stripe` package);
 * Firestore, Loops, and the dashboard-invite side effect are mocked.
 */
const {
  payload,
  signature,
  orderId,
  orderGet,
  orderSet,
  pendingOrderSet,
  batchCommit,
  auditLeadsUpdate,
  auditLeadGet,
  analyticsAdd,
  resolveOrCreateUserIdForInvite,
  sendSiteFixPaymentConfirmedEmail,
} = vi.hoisted(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fixture';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_signing_key_1234567890';

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const StripeCtor = require('stripe');

  const orderId = 'order-idempotency-test';
  const auditLeadId = 'audit-lead-idempotency-test';

  const eventPayload = JSON.stringify({
    id: 'evt_test_idempotency',
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2025-12-15.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: 'cs_test_idempotency',
        object: 'checkout.session',
        payment_intent: 'pi_test_idempotency',
        metadata: {
          productType: 'site_fix',
          orderId,
          auditLeadId,
          sku: 'speed_fix',
          normalizedEmail: 'qa+webhook-idempotency@example.com',
        },
      },
    },
  });

  const stripeForSigning = new StripeCtor('sk_test_dummy_signing_key_1234567890', {
    apiVersion: '2025-12-15.clover',
  });
  const eventSignature = stripeForSigning.webhooks.generateTestHeaderString({
    payload: eventPayload,
    secret: 'whsec_test_fixture',
  });

  return {
    payload: eventPayload,
    signature: eventSignature,
    orderId,
    orderGet: vi.fn(),
    orderSet: vi.fn(),
    pendingOrderSet: vi.fn(),
    batchCommit: vi.fn(async () => undefined),
    auditLeadsUpdate: vi.fn(async () => undefined),
    auditLeadGet: vi.fn(async () => ({ exists: true })),
    analyticsAdd: vi.fn(async () => undefined),
    resolveOrCreateUserIdForInvite: vi.fn(async () => null),
    sendSiteFixPaymentConfirmedEmail: vi.fn(async () => undefined),
  };
});

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map([['stripe-signature', signature]])),
}));

vi.mock('@sentry/nextjs', () => ({
  startSpan: (_opts: unknown, fn: (span: { setAttribute: () => void }) => unknown) =>
    fn({ setAttribute: () => {} }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'orders') {
        return { doc: () => ({ __collection: 'orders', get: orderGet }) };
      }
      if (name === 'pending_orders') {
        return { doc: () => ({ __collection: 'pending_orders' }) };
      }
      if (name === 'auditLeads') {
        return { doc: () => ({ get: auditLeadGet, update: auditLeadsUpdate }) };
      }
      if (name === 'analyticsEvents') {
        return { add: analyticsAdd };
      }
      throw new Error(`Unexpected Firestore collection in test: ${name}`);
    },
    batch: () => ({
      set: (ref: { __collection: string }, data: unknown) => {
        if (ref.__collection === 'orders') orderSet(data);
        if (ref.__collection === 'pending_orders') pendingOrderSet(data);
      },
      commit: batchCommit,
    }),
  },
}));

vi.mock('@/lib/book-service/emails', () => ({
  sendSiteFixPaymentConfirmedEmail,
}));

vi.mock('@/lib/book-service/dashboard-invite', () => ({
  resolveOrCreateUserIdForInvite,
  processDashboardInvite: vi.fn(),
}));

const { mockApplyRateLimit } = vi.hoisted(() => ({
  mockApplyRateLimit: vi.fn(),
}));

vi.mock('@/lib/middleware/rateLimiting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/middleware/rateLimiting')>();
  return {
    ...actual,
    checkRateLimit: async (
      req: import('next/server').NextRequest,
      limiter: unknown
    ) => {
      const result = await mockApplyRateLimit(limiter, actual.getClientIdentifier(req));
      if (!result.success) {
        const headers = actual.getRateLimitHeaders(result);
        const retryAfterSeconds = headers['Retry-After']
          ? parseInt(headers['Retry-After'], 10)
          : 60;
        return {
          error: {
            error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
            retryAfter: retryAfterSeconds,
          },
          status: 429,
          headers,
        };
      }
      return null;
    },
    getClientIdentifier: () => '127.0.0.1',
  };
});

import { POST } from '@/app/api/webhooks/stripe/route';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body: payload,
  });
}

describe('POST /api/webhooks/stripe — site fix idempotency', () => {
  beforeEach(() => {
    mockApplyRateLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
    orderGet.mockReset();
    orderSet.mockClear();
    pendingOrderSet.mockClear();
    batchCommit.mockClear();
    auditLeadsUpdate.mockClear();
    auditLeadGet.mockClear();
    auditLeadGet.mockResolvedValue({ exists: true });
    analyticsAdd.mockClear();
    resolveOrCreateUserIdForInvite.mockClear();
    sendSiteFixPaymentConfirmedEmail.mockClear();
  });

  it('writes the order once, then no-ops on a retried webhook delivery', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    orderGet.mockResolvedValueOnce({ exists: false });
    const first = await POST(makeRequest());
    expect(first.status).toBe(200);
    expect(orderSet).toHaveBeenCalledTimes(1);
    expect(pendingOrderSet).toHaveBeenCalledTimes(1);
    expect(batchCommit).toHaveBeenCalledTimes(1);

    orderGet.mockResolvedValueOnce({ exists: true });
    const second = await POST(makeRequest());
    expect(second.status).toBe(200);

    // Core idempotency assertion: the retried delivery must not write again.
    expect(orderSet).toHaveBeenCalledTimes(1);
    expect(pendingOrderSet).toHaveBeenCalledTimes(1);
    expect(batchCommit).toHaveBeenCalledTimes(1);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`duplicate webhook, orderId=${orderId} already processed`)
    );

    logSpy.mockRestore();
  });

  it('returns 429 when webhook rate limit is exceeded before signature verification', async () => {
    mockApplyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(orderGet).not.toHaveBeenCalled();
  });

  it('allows a legitimate signed webhook when under the rate limit', async () => {
    orderGet.mockResolvedValueOnce({ exists: false });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(orderSet).toHaveBeenCalledTimes(1);
  });
});
