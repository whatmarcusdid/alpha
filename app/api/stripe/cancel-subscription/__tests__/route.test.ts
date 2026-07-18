import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SENSITIVE_MESSAGE = 'No such subscription: sub_secret123';

const { mockVerifyIdToken, mockStripeCancel } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockStripeCancel: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            subscription: {
              stripeSubscriptionId: 'sub_test_123',
            },
          }),
        }),
        update: vi.fn(),
      }),
    }),
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    subscriptions: {
      cancel: (...args: unknown[]) => mockStripeCancel(...args),
    },
  })),
}));

vi.mock('@/lib/validation', () => ({
  validateRequestBody: vi.fn(async () => ({
    success: true,
    data: { reason: 'too expensive' },
  })),
  cancelSubscriptionSchema: {},
}));

import { POST } from '@/app/api/stripe/cancel-subscription/route';

describe('POST /api/stripe/cancel-subscription production error sanitization', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_123' });
    mockStripeCancel.mockRejectedValue(new Error(SENSITIVE_MESSAGE));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns generic error without Stripe message in production', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(
      new NextRequest('http://localhost:3000/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'too expensive' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(SENSITIVE_MESSAGE);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
