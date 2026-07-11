import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkoutSessionsCreate } = vi.hoisted(() => ({
  checkoutSessionsCreate: vi.fn(),
}));

vi.mock('@/lib/middleware/apiHandler', () => ({
  withRateLimit: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

vi.mock('@/lib/book-service/skus', () => ({
  getSKUPriceMap: () => ({
    speed_fix: 'price_speed_fix',
    security_fix: 'price_security_fix',
    seo_ai_visibility_fix: 'price_seo_fix',
    full_bundle: 'price_full_bundle',
  }),
}));

vi.mock('@/lib/stripe-server', () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: checkoutSessionsCreate,
      },
    },
  }),
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'test-order-id',
}));

import { POST } from '@/app/api/book-service/checkout/route';

const baseBody = {
  auditLeadId: 'audit-lead-123',
  sku: 'speed_fix' as const,
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/book-service/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/book-service/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkoutSessionsCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/test-session',
    });
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  it('accepts an empty normalizedEmail string and treats it as absent', async () => {
    const response = await POST(makeRequest({ ...baseBody, normalizedEmail: '' }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      data: { url: 'https://checkout.stripe.com/test-session' },
    });

    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          normalizedEmail: '',
        }),
      })
    );
    expect(checkoutSessionsCreate.mock.calls[0][0]).not.toHaveProperty(
      'customer_email'
    );
  });

  it('succeeds when normalizedEmail is omitted', async () => {
    const response = await POST(makeRequest({ ...baseBody }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(checkoutSessionsCreate.mock.calls[0][0]).not.toHaveProperty(
      'customer_email'
    );
  });

  it('passes a valid normalizedEmail to Stripe customer_email', async () => {
    const response = await POST(
      makeRequest({ ...baseBody, normalizedEmail: 'Buyer@Example.com' })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'buyer@example.com',
        metadata: expect.objectContaining({
          normalizedEmail: 'buyer@example.com',
        }),
      })
    );
  });
});
