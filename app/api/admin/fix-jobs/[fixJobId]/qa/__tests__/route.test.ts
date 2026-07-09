import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patchFixSessionQa, requireAdmin } = vi.hoisted(() => ({
  patchFixSessionQa: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/patch-fix-session-qa', () => ({
  patchFixSessionQa,
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

import { PATCH } from '@/app/api/admin/fix-jobs/[fixJobId]/qa/route';

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/fix-jobs/s1/qa', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/fix-jobs/[fixJobId]/qa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('returns success for set_manual_check', async () => {
    patchFixSessionQa.mockResolvedValueOnce({ perPillar: { security: 'in_progress' } });

    const response = await PATCH(
      makePatchRequest({
        type: 'set_manual_check',
        uid: 'user_1',
        pillar: 'security',
        itemId: 'external_scan',
        checked: true,
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  it('returns perPillar for decide', async () => {
    patchFixSessionQa.mockResolvedValueOnce({ perPillar: { security: 'passed' } });

    const response = await PATCH(
      makePatchRequest({
        type: 'decide',
        uid: 'user_1',
        pillar: 'security',
        status: 'passed',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.perPillar.security).toBe('passed');
  });
});
