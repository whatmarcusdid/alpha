import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patchFixSessionProgress, requireAdmin } = vi.hoisted(() => ({
  patchFixSessionProgress: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/patch-fix-session-progress', () => ({
  patchFixSessionProgress,
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

import { PATCH } from '@/app/api/admin/fix-jobs/[fixJobId]/progress/route';

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/fix-jobs/s1/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/fix-jobs/[sessionId]/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('set_phase0 true → phase0Complete written, subsequent set_steps allowed', async () => {
    patchFixSessionProgress.mockResolvedValueOnce({ signalKey: '', status: 'pending' });

    const response = await PATCH(
      makePatchRequest({
        uid: 'user_1',
        action: { type: 'set_phase0', complete: true },
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    expect(patchFixSessionProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { type: 'set_phase0', complete: true },
      })
    );
  });

  it('set_steps before phase0Complete → 409', async () => {
    patchFixSessionProgress.mockResolvedValueOnce({
      status: 409,
      error: 'Complete Phase 0 (backup + baseline) first',
    });

    const response = await PATCH(
      makePatchRequest({
        uid: 'user_1',
        signalKey: 'no_https',
        action: { type: 'set_steps', completedStepIds: [] },
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(409);
  });
});
