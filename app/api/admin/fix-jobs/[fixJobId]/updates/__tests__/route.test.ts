import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postFixUpdate, requireAdmin, applyRateLimit } = vi.hoisted(() => ({
  postFixUpdate: vi.fn(),
  requireAdmin: vi.fn(),
  applyRateLimit: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/post-fix-update', () => ({
  postFixUpdate,
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  adminFixUpdatesLimiter: {},
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
      handler: (
        req: NextRequest,
        context: { params?: Promise<{ fixJobId?: string }>; userId: string }
      ) => Promise<NextResponse>
    ) => {
      return async (
        req: NextRequest,
        context: { params?: Promise<{ fixJobId?: string }> }
      ) => {
        const result = await auth.requireAdmin(req);
        if (auth.isAdminAuthError(result)) {
          return result;
        }

        return handler(req, {
          ...context,
          userId: (result as { userId: string }).userId,
        });
      };
    },
  };
});

import { POST } from '@/app/api/admin/fix-jobs/[fixJobId]/updates/route';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/fix-jobs/s1/updates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/fix-jobs/[fixJobId]/updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    applyRateLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
  });

  it('non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await POST(
      makePostRequest({ uid: 'user_1', message: 'Hello' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('empty message after trim → 400', async () => {
    const response = await POST(
      makePostRequest({ uid: 'user_1', message: '   ' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('281 character message → 400', async () => {
    const response = await POST(
      makePostRequest({ uid: 'user_1', message: 'a'.repeat(281) }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('"We configured WP Rocket" → 400 naming "WP Rocket"', async () => {
    postFixUpdate.mockResolvedValueOnce({
      status: 400,
      error:
        'Update contains a technical tool name — rewrite in plain language (found: "WP Rocket")',
    });

    const response = await POST(
      makePostRequest({ uid: 'user_1', message: 'We configured WP Rocket' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('WP Rocket');
  });

  it('"We sped up your site\'s caching" → 200', async () => {
    postFixUpdate.mockResolvedValueOnce({ updateId: 'update_1' });

    const response = await POST(
      makePostRequest({ uid: 'user_1', message: "We sped up your site's caching" }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('"sucuri found malware" → 400 naming "Sucuri" (case-insensitive)', async () => {
    postFixUpdate.mockResolvedValueOnce({
      status: 400,
      error:
        'Update contains a technical tool name — rewrite in plain language (found: "Sucuri")',
    });

    const response = await POST(
      makePostRequest({ uid: 'user_1', message: 'sucuri found malware' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Sucuri');
  });

  it('signalKey not in fixProgress → 400', async () => {
    postFixUpdate.mockResolvedValueOnce({
      status: 400,
      error: 'Signal key not found in this session',
    });

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        message: 'We improved security',
        signalKey: 'missing_key',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('valid post writes fixUpdates doc with correct shape', async () => {
    postFixUpdate.mockResolvedValueOnce({ updateId: 'update_1' });

    const response = await POST(
      makePostRequest({ uid: 'user_1', message: 'We improved your site speed' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    expect(postFixUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user_1',
        sessionId: 's1',
        message: 'We improved your site speed',
      })
    );
  });

  it('valid post bumps session updatedAt', async () => {
    postFixUpdate.mockResolvedValueOnce({ updateId: 'update_1' });

    await POST(
      makePostRequest({ uid: 'user_1', message: 'We improved your site speed' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(postFixUpdate).toHaveBeenCalled();
  });

  it('rate limit: 21st call/min → 429', async () => {
    applyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST(
      makePostRequest({ uid: 'user_1', message: 'Update text' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(429);
  });
});
