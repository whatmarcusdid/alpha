import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockApplyRateLimit, mockSubscriptionsCreate, mockCustomersCreate } = vi.hoisted(() => ({
  mockApplyRateLimit: vi.fn(),
  mockSubscriptionsCreate: vi.fn(),
  mockCustomersCreate: vi.fn(),
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

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: vi.fn(async () => ({ userId: 'user_checkout_1' })),
  isAuthError: (result: unknown) => result instanceof Response,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {},
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: () => ({}) }),
        update: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: {
      retrieve: vi.fn(),
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      update: vi.fn(),
    },
    paymentMethods: { attach: vi.fn() },
    subscriptions: { create: (...args: unknown[]) => mockSubscriptionsCreate(...args) },
    coupons: { retrieve: vi.fn() },
  })),
}));

import { POST } from '@/app/api/checkout/create-subscription/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/checkout/create-subscription', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/checkout/create-subscription rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
    mockCustomersCreate.mockResolvedValue({ id: 'cus_test' });
    mockSubscriptionsCreate.mockResolvedValue({
      id: 'sub_test',
      status: 'incomplete',
      latest_invoice: { payment_intent: { client_secret: 'pi_secret' } },
      current_period_start: 1,
      current_period_end: 2,
    });
  });

  it('returns 429 when checkout rate limit is exceeded', async () => {
    mockApplyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST(
      makeRequest({
        email: 'user@example.com',
        tier: 'essential',
        billingCycle: 'monthly',
        paymentMethodId: 'pm_test',
      })
    );

    expect(response.status).toBe(429);
    expect(mockSubscriptionsCreate).not.toHaveBeenCalled();
  });

  it('allows a single valid request when under the checkout limit', async () => {
    const response = await POST(
      makeRequest({
        email: 'user@example.com',
        tier: 'essential',
        billingCycle: 'monthly',
        paymentMethodId: 'pm_test',
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockSubscriptionsCreate).toHaveBeenCalledTimes(1);
  });
});
