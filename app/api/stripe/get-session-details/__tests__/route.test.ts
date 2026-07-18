import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EMAIL_A = 'owner@example.com';
const EMAIL_B = 'attacker@example.com';
const SESSION_ID = 'cs_test_owner_session';
const CUSTOMER_ID = 'cus_owner';
const SUBSCRIPTION_ID = 'sub_owner';

const { mockVerifyIdToken, mockGetUser, mockSessionsRetrieve } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockGetUser: vi.fn(),
  mockSessionsRetrieve: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  },
  adminDb: {},
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  generalLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'uid_attacker' }),
  isAuthError: vi.fn().mockReturnValue(false),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  startSpan: (_config: unknown, fn: (span: { setAttribute: () => void }) => unknown) =>
    fn({ setAttribute: vi.fn() }),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]) => mockSessionsRetrieve(...args),
      },
    },
  })),
}));

import { POST } from '@/app/api/stripe/get-session-details/route';

function makeRequest(sessionId: string, token = 'valid-token'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/get-session-details', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });
}

describe('POST /api/stripe/get-session-details', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSessionsRetrieve.mockResolvedValue({
      payment_status: 'paid',
      amount_total: 89900,
      customer: { id: CUSTOMER_ID, email: EMAIL_A },
      subscription: { id: SUBSCRIPTION_ID },
      customer_details: { email: EMAIL_A },
      currency: 'usd',
      metadata: { tier: 'premium', billingCycle: 'yearly' },
    });
  });

  it('denies User B retrieving User A checkout session (IDOR exploit)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid_attacker', email: EMAIL_B });

    const response = await POST(makeRequest(SESSION_ID));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('allows legitimate same-email session lookup', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid_owner', email: EMAIL_A });

    const response = await POST(makeRequest(SESSION_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.customerId).toBe(CUSTOMER_ID);
    expect(body.subscriptionId).toBe(SUBSCRIPTION_ID);
    expect(body.customerEmail).toBe(EMAIL_A);
    expect(body.tier).toBe('premium');
  });
});
