import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifySessionCookie, mockApplyRateLimit } = vi.hoisted(() => ({
  mockVerifySessionCookie: vi.fn(),
  mockApplyRateLimit: vi.fn(),
}));

vi.mock('@/lib/firebase/session', () => ({
  verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
  SESSION_COOKIE_NAME: '__session',
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

import { GET } from '@/app/api/auth/verify-session/route';

describe('GET /api/auth/verify-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyRateLimit.mockResolvedValue({
      success: true,
      limit: 180,
      remaining: 179,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
  });

  it('returns 401 when session cookie is missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3000/api/auth/verify-session')
    );

    expect(response.status).toBe(401);
    expect(mockVerifySessionCookie).not.toHaveBeenCalled();
  });

  it('returns 401 when session verification fails', async () => {
    mockVerifySessionCookie.mockResolvedValue(null);

    const response = await GET(
      new NextRequest('http://localhost:3000/api/auth/verify-session', {
        headers: {
          cookie: '__session=invalid-session-cookie',
        },
      })
    );

    expect(response.status).toBe(401);
    expect(mockVerifySessionCookie).toHaveBeenCalledWith('invalid-session-cookie');
  });

  it('returns 200 for a verified session', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user_123',
      email: 'user@example.com',
      displayName: 'User',
      isAdmin: false,
      decoded: {},
    });

    const response = await GET(
      new NextRequest('http://localhost:3000/api/auth/verify-session', {
        headers: {
          cookie: '__session=valid-session-cookie',
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: true, uid: 'user_123', isAdmin: false });
  });

  it('returns 429 when session verify rate limit is exceeded', async () => {
    mockApplyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 180,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await GET(
      new NextRequest('http://localhost:3000/api/auth/verify-session', {
        headers: {
          cookie: '__session=valid-session-cookie',
        },
      })
    );

    expect(response.status).toBe(429);
    expect(mockVerifySessionCookie).not.toHaveBeenCalled();
  });
});
