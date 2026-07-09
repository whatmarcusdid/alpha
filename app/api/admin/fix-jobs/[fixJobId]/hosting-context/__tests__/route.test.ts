import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { confirmHostingContext, requireAdmin } = vi.hoisted(() => ({
  confirmHostingContext: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/confirm-hosting-context', () => ({
  confirmHostingContext,
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

import { PATCH } from '@/app/api/admin/fix-jobs/[fixJobId]/hosting-context/route';

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/fix-jobs/s1/hosting-context', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/fix-jobs/[fixJobId]/hosting-context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('non-admin → 403', async () => {
    requireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await PATCH(makePatchRequest({ uid: 'user_1', host: 'kinsta', cms: 'wordpress', plugins: [] }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(403);
  });

  it('missing session → 404', async () => {
    confirmHostingContext.mockResolvedValueOnce({
      success: false,
      status: 404,
      error: 'Fix job not found',
    });

    const response = await PATCH(makePatchRequest({ uid: 'user_1', host: 'kinsta', cms: 'wordpress', plugins: [] }), {
      params: Promise.resolve({ fixJobId: 'missing' }),
    });

    expect(response.status).toBe(404);
  });

  it('empty host → 400', async () => {
    const response = await PATCH(makePatchRequest({ uid: 'user_1', host: '', cms: 'wordpress', plugins: [] }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(400);
    expect(confirmHostingContext).not.toHaveBeenCalled();
  });

  it('plugins array > 50 items → 400', async () => {
    const response = await PATCH(
      makePatchRequest({
        uid: 'user_1',
        host: 'kinsta',
        cms: 'wordpress',
        plugins: Array.from({ length: 51 }, (_, index) => `plugin-${index}`),
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
  });

  it('valid PATCH: returns isConfirmed true', async () => {
    confirmHostingContext.mockResolvedValueOnce({
      success: true,
      hostingContext: {
        host: 'kinsta',
        cms: 'wordpress',
        cmsVersion: '6.4',
        plugins: ['WP Rocket'],
        confirmedAt: '2026-07-09T12:00:00.000Z',
        confirmedBy: 'admin_1',
        isConfirmed: true,
      },
    });

    const response = await PATCH(
      makePatchRequest({
        uid: 'user_1',
        host: 'kinsta',
        cms: 'wordpress',
        cmsVersion: '6.4',
        plugins: ['WP Rocket'],
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.hostingContext.isConfirmed).toBe(true);
    expect(confirmHostingContext).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user_1',
        sessionId: 's1',
        adminUid: 'admin_1',
      })
    );
  });
});
