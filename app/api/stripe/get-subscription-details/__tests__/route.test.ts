import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EMAIL_A = 'owner@example.com';
const EMAIL_B = 'attacker@example.com';
const PAYMENT_INTENT_ID = 'pi_test_owner';
const CUSTOMER_ID = 'cus_owner';

const { mockVerifyIdToken, mockPaymentIntentsRetrieve, mockCustomersRetrieve } =
  vi.hoisted(() => ({
    mockVerifyIdToken: vi.fn(),
    mockPaymentIntentsRetrieve: vi.fn(),
    mockCustomersRetrieve: vi.fn(),
  }));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    getUser: vi.fn(),
  },
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  generalLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'uid_attacker' }),
  isAuthError: vi.fn().mockReturnValue(false),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: (...args: unknown[]) => mockPaymentIntentsRetrieve(...args),
    },
    customers: {
      retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args),
    },
  })),
}));

import { POST } from '@/app/api/stripe/get-subscription-details/route';

function makeRequest(paymentIntentId: string, token = 'valid-token'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/get-subscription-details', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentIntentId }),
  });
}

describe('POST /api/stripe/get-subscription-details', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: PAYMENT_INTENT_ID,
      status: 'succeeded',
      customer: CUSTOMER_ID,
      receipt_email: EMAIL_A,
    });

    mockCustomersRetrieve.mockResolvedValue({
      id: CUSTOMER_ID,
      email: EMAIL_A,
      deleted: false,
    });
  });

  it('denies User B retrieving User A payment intent (IDOR exploit)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid_attacker', email: EMAIL_B });

    const response = await POST(makeRequest(PAYMENT_INTENT_ID));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('allows legitimate same-email payment intent lookup', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid_owner', email: EMAIL_A });

    const response = await POST(makeRequest(PAYMENT_INTENT_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stripeCustomerId).toBe(CUSTOMER_ID);
    expect(body.paymentStatus).toBe('succeeded');
  });
});
