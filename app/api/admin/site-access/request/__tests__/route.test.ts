import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSiteAccessRequest, requireAdmin, applyRateLimit } = vi.hoisted(() => ({
  createSiteAccessRequest: vi.fn(),
  requireAdmin: vi.fn(),
  applyRateLimit: vi.fn(),
}));

vi.mock('@/lib/site-access/create-site-access-request', () => ({
  createSiteAccessRequest,
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  adminSiteAccessRequestLimiter: {},
  applyRateLimit,
  getRateLimitHeaders: () => ({}),
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin,
  isAdminAuthError: (result: unknown) => result instanceof NextResponse,
}));

vi.mock('@/lib/middleware/apiHandler', async () => {
  const auth = await import('@/lib/middleware/auth');
  return {
    withAdmin: (
      handler: (req: NextRequest, context: { userId: string }) => Promise<NextResponse>
    ) => {
      return async (req: NextRequest) => {
        const result = await auth.requireAdmin(req);
        if (auth.isAdminAuthError(result)) {
          return result;
        }

        return handler(req, {
          userId: (result as { userId: string }).userId,
        });
      };
    },
  };
});

import { POST } from '@/app/api/admin/site-access/request/route';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/site-access/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/site-access/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    applyRateLimit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
  });

  it('non-admin → 403', async () => {
    requireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        sessionId: 'session_1',
        accessType: 'wp_admin',
        scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      })
    );

    expect(response.status).toBe(403);
  });

  it('missing session → 404', async () => {
    createSiteAccessRequest.mockResolvedValueOnce({
      success: false,
      status: 404,
      error: 'Fix job not found',
    });

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        sessionId: 'missing',
        accessType: 'wp_admin',
        scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      })
    );

    expect(response.status).toBe(404);
  });

  it('existing pending request for same session → 409', async () => {
    createSiteAccessRequest.mockResolvedValueOnce({
      success: false,
      status: 409,
      error: 'A pending access request already exists for this job',
    });

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        sessionId: 'session_1',
        accessType: 'wp_admin',
        scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      })
    );

    expect(response.status).toBe(409);
  });

  it('valid request: returns requestId', async () => {
    createSiteAccessRequest.mockResolvedValueOnce({
      success: true,
      requestId: 'req_1',
    });

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        sessionId: 'session_1',
        accessType: 'wp_admin',
        scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
        expiryDays: 7,
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: { requestId: 'req_1' } });
    expect(createSiteAccessRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user_1',
        sessionId: 'session_1',
        adminUid: 'admin_1',
      })
    );
  });

  it('rate limit: 6th call/min → 429', async () => {
    applyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        sessionId: 'session_1',
        accessType: 'wp_admin',
        scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      })
    );

    expect(response.status).toBe(429);
  });
});
