import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deliverSiteFix, requireAdmin } = vi.hoisted(() => ({
  deliverSiteFix: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/deliver-site-fix', () => ({
  deliverSiteFix,
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

import { POST } from '@/app/api/admin/fix-jobs/[fixJobId]/deliver/route';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/fix-jobs/s1/deliver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/fix-jobs/[fixJobId]/deliver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('invalid loomUrl host → 400', async () => {
    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        loomUrl: 'https://youtube.com/watch?v=abc',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(400);
    expect(deliverSiteFix).not.toHaveBeenCalled();
  });

  it('stage not report_ready → 409', async () => {
    deliverSiteFix.mockResolvedValueOnce({
      status: 409,
      error: 'Job is not in report_ready stage',
    });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(409);
  });

  it('report.status sent → 409 "Already delivered" (idempotency)', async () => {
    deliverSiteFix.mockResolvedValueOnce({
      status: 409,
      error: 'Already delivered',
    });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('Already delivered');
  });

  it('successful deliver returns sentAt', async () => {
    deliverSiteFix.mockResolvedValueOnce({
      sentAt: '2026-07-09T12:00:00.000Z',
    });

    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        loomUrl: 'https://loom.com/share/abc',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    expect(deliverSiteFix).toHaveBeenCalledWith({
      uid: 'user_1',
      sessionId: 's1',
      adminUid: 'admin_1',
      loomUrl: 'https://loom.com/share/abc',
    });

    const body = await response.json();
    expect(body.data.sentAt).toBe('2026-07-09T12:00:00.000Z');
  });

  it('Loops failure → 500', async () => {
    deliverSiteFix.mockResolvedValueOnce({
      status: 500,
      error: 'Failed to send delivery email',
    });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(500);
  });
});
