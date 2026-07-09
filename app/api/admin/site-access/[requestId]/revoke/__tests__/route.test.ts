import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { revokeSiteAccessRequest, requireAdmin } = vi.hoisted(() => ({
  revokeSiteAccessRequest: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/site-access/revoke-site-access-request', () => ({
  revokeSiteAccessRequest,
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
        context: { params?: Promise<{ requestId?: string }>; userId: string }
      ) => Promise<NextResponse>
    ) => {
      return async (
        req: NextRequest,
        context: { params?: Promise<{ requestId?: string }> }
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

import { PATCH } from '@/app/api/admin/site-access/[requestId]/revoke/route';

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/site-access/req_1/revoke', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/site-access/[requestId]/revoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('non-admin → 403', async () => {
    requireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await PATCH(makePatchRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ requestId: 'req_1' }),
    });

    expect(response.status).toBe(403);
  });

  it('mismatched clientUid → 403', async () => {
    revokeSiteAccessRequest.mockResolvedValueOnce({
      success: false,
      status: 403,
      error: 'Forbidden',
    });

    const response = await PATCH(makePatchRequest({ uid: 'user_2' }), {
      params: Promise.resolve({ requestId: 'req_1' }),
    });

    expect(response.status).toBe(403);
  });

  it('already revoked → 409', async () => {
    revokeSiteAccessRequest.mockResolvedValueOnce({
      success: false,
      status: 409,
      error: 'Already revoked',
    });

    const response = await PATCH(makePatchRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ requestId: 'req_1' }),
    });

    expect(response.status).toBe(409);
  });

  it('valid revoke: success true', async () => {
    revokeSiteAccessRequest.mockResolvedValueOnce({ success: true });

    const response = await PATCH(makePatchRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ requestId: 'req_1' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(revokeSiteAccessRequest).toHaveBeenCalledWith({
      requestId: 'req_1',
      uid: 'user_1',
    });
  });
});
