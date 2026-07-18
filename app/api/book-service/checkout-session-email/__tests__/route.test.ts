import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkoutSessionsRetrieve } = vi.hoisted(() => ({
  checkoutSessionsRetrieve: vi.fn(),
}));

vi.mock('@/lib/middleware/apiHandler', () => ({
  withRateLimit: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

vi.mock('@/lib/stripe-server', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: checkoutSessionsRetrieve,
      },
    },
  }),
}));

import { GET } from '@/app/api/book-service/checkout-session-email/route';

describe('GET /api/book-service/checkout-session-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns checkout email when session metadata matches orderId', async () => {
    checkoutSessionsRetrieve.mockResolvedValue({
      metadata: {
        productType: 'site_fix',
        orderId: 'order-123',
      },
      customer_details: { email: 'Buyer@Example.com' },
    });

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/book-service/checkout-session-email?orderId=order-123&session_id=cs_test_abc'
      )
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: { email: 'buyer@example.com' },
    });
  });

  it('returns 403 when session orderId does not match request orderId', async () => {
    checkoutSessionsRetrieve.mockResolvedValue({
      metadata: {
        productType: 'site_fix',
        orderId: 'other-order',
      },
      customer_details: { email: 'buyer@example.com' },
    });

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/book-service/checkout-session-email?orderId=order-123&session_id=cs_test_abc'
      )
    );

    expect(response.status).toBe(403);
  });

  it('returns 404 when Stripe session has no email yet', async () => {
    checkoutSessionsRetrieve.mockResolvedValue({
      metadata: {
        productType: 'site_fix',
        orderId: 'order-123',
      },
      customer_details: {},
    });

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/book-service/checkout-session-email?orderId=order-123&session_id=cs_test_abc'
      )
    );

    expect(response.status).toBe(404);
  });
});
