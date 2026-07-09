import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patchFixSessionStage, requireAdmin } = vi.hoisted(() => ({
  patchFixSessionStage: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/patch-fix-session-stage', () => ({
  patchFixSessionStage,
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

import { PATCH } from '@/app/api/admin/fix-jobs/[fixJobId]/stage/route';

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/fix-jobs/s1/stage', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/fix-jobs/[sessionId]/stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('successful transition appends to stageHistory with adminUid', async () => {
    patchFixSessionStage.mockResolvedValueOnce({ stage: 'qa' });

    const response = await PATCH(
      makePatchRequest({ uid: 'user_1', toStage: 'qa' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    expect(patchFixSessionStage).toHaveBeenCalledWith({
      uid: 'user_1',
      sessionId: 's1',
      toStage: 'qa',
      adminUid: 'admin_1',
    });
  });

  it('in_progress → qa with incomplete signals → 409 listing signal keys', async () => {
    patchFixSessionStage.mockResolvedValueOnce({
      status: 409,
      error: 'Cannot move to QA: 1 signal(s) incomplete: no_https',
    });

    const response = await PATCH(
      makePatchRequest({ uid: 'user_1', toStage: 'qa' }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(409);
  });
});
