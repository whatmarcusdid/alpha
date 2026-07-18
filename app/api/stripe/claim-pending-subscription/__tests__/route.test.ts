import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EMAIL_A = 'owner@example.com';
const EMAIL_B = 'attacker@example.com';
const UID_A = 'uid_owner';
const UID_B = 'uid_attacker';

const pendingStore = new Map<
  string,
  {
    status: string;
    claimedBy?: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    tier: string;
    billingCycle: string;
    amount: number;
  }
>();

const { mockVerifyIdToken, mockGetUser, mockPendingGet, mockPendingUpdate } =
  vi.hoisted(() => ({
    mockVerifyIdToken: vi.fn(),
    mockGetUser: vi.fn(),
    mockPendingGet: vi.fn(),
    mockPendingUpdate: vi.fn(),
  }));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  },
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: () => mockPendingGet(name, id),
        update: (data: Record<string, unknown>) => mockPendingUpdate(name, id, data),
      }),
    }),
  },
}));

vi.mock('@/lib/firebase/verify-id-token', () => ({
  verifyAuthIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
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

import { POST } from '@/app/api/stripe/claim-pending-subscription/route';

function makeRequest(email: string, token = 'valid-token'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/claim-pending-subscription', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
}

describe('POST /api/stripe/claim-pending-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingStore.clear();
    mockApplyRateLimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    mockPendingGet.mockImplementation(async (_collection: string, id: string) => {
      const data = pendingStore.get(id);
      return {
        exists: Boolean(data),
        data: () => data,
      };
    });

    mockPendingUpdate.mockImplementation(
      async (_collection: string, id: string, patch: Record<string, unknown>) => {
        const existing = pendingStore.get(id);
        if (!existing) {
          throw new Error('missing doc');
        }
        pendingStore.set(id, { ...existing, ...patch });
      }
    );

    pendingStore.set(EMAIL_A, {
      status: 'pending',
      stripeCustomerId: 'cus_owner',
      stripeSubscriptionId: 'sub_owner',
      tier: 'premium',
      billingCycle: 'monthly',
      amount: 99,
    });
  });

  it('denies User B claiming with User A email (IDOR exploit)', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: UID_B,
      email: EMAIL_B,
    });

    const response = await POST(makeRequest(EMAIL_A));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden' });
    expect(pendingStore.get(EMAIL_A)?.status).toBe('pending');
    expect(pendingStore.get(EMAIL_A)?.claimedBy).toBeUndefined();
    expect(mockPendingUpdate).not.toHaveBeenCalled();
  });

  it('allows legitimate same-email claim when pending subscription exists', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: UID_A,
      email: EMAIL_A,
    });

    const response = await POST(makeRequest(`  ${EMAIL_A.toUpperCase()}  `));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.subscription).toEqual({
      stripeCustomerId: 'cus_owner',
      stripeSubscriptionId: 'sub_owner',
      tier: 'premium',
      billingCycle: 'monthly',
      amount: 99,
    });
    expect(pendingStore.get(EMAIL_A)?.status).toBe('claimed');
    expect(pendingStore.get(EMAIL_A)?.claimedBy).toBe(UID_A);
  });

  it('resolves email from Auth user record when token omits email claim', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: UID_A });
    mockGetUser.mockResolvedValue({ uid: UID_A, email: EMAIL_A });

    const response = await POST(makeRequest(EMAIL_A));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockGetUser).toHaveBeenCalledWith(UID_A);
  });

  it('returns no pending subscription for own email without leaking on mismatch shape', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: UID_B,
      email: EMAIL_B,
    });

    const response = await POST(makeRequest(EMAIL_B));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: false,
      message: 'No pending subscription found',
      subscription: null,
    });
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockApplyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: UID_A,
      email: EMAIL_A,
    });

    const response = await POST(makeRequest(EMAIL_A));

    expect(response.status).toBe(429);
    expect(mockPendingUpdate).not.toHaveBeenCalled();
  });
});
