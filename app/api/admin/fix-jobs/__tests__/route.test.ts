import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listFixSessionsForAdmin, requireAdmin } = vi.hoisted(() => ({
  listFixSessionsForAdmin: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/fix-jobs/list-fix-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/fix-jobs/list-fix-sessions')>();
  return {
    ...actual,
    listFixSessionsForAdmin,
  };
});

vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin,
  isAdminAuthError: (result: unknown) => result instanceof NextResponse,
}));

vi.mock('@/lib/middleware/apiHandler', async () => {
  const auth = await import('@/lib/middleware/auth');
  return {
    withAdmin: (handler: (req: NextRequest) => Promise<NextResponse>) => {
      return async (req: NextRequest) => {
        const result = await auth.requireAdmin(req);
        if (auth.isAdminAuthError(result)) {
          return result;
        }
        return handler(req);
      };
    },
  };
});

import { GET } from '@/app/api/admin/fix-jobs/route';

function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { headers });
}

describe('GET /api/admin/fix-jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFixSessionsForAdmin.mockResolvedValue({ jobs: [] });
  });

  it('unauthenticated request → 401', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const response = await GET(makeRequest('http://localhost:3000/api/admin/fix-jobs'));
    expect(response.status).toBe(401);
  });

  it('authenticated non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await GET(
      makeRequest('http://localhost:3000/api/admin/fix-jobs', {
        Authorization: 'Bearer token',
      })
    );
    expect(response.status).toBe(403);
  });

  it('invalid stage param → 400', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });

    const response = await GET(
      makeRequest('http://localhost:3000/api/admin/fix-jobs?stage=not_a_stage')
    );
    expect(response.status).toBe(400);
  });

  it('stage=all returns all sessions across multiple users (collection group)', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    listFixSessionsForAdmin.mockResolvedValue({
      jobs: [
        {
          sessionId: 'ord_a',
          uid: 'user_a',
          stage: 'ready',
          customerName: 'A',
          customerEmail: 'a@test.com',
          siteUrl: 'https://a.test',
          entitlements: ['speed'],
          nextAction: 'Start Phase 0',
          updatedAt: '2026-07-09T10:00:00.000Z',
          signalsTotal: 2,
          signalsDone: 0,
        },
        {
          sessionId: 'ord_b',
          uid: 'user_b',
          stage: 'in_progress',
          customerName: 'B',
          customerEmail: 'b@test.com',
          siteUrl: 'https://b.test',
          entitlements: ['security'],
          nextAction: '1 of 3 signals remaining',
          updatedAt: '2026-07-09T09:00:00.000Z',
          signalsTotal: 3,
          signalsDone: 2,
        },
      ],
    });

    const response = await GET(
      makeRequest('http://localhost:3000/api/admin/fix-jobs?stage=all')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listFixSessionsForAdmin).toHaveBeenCalledWith({
      stage: 'all',
      limit: 50,
      cursor: undefined,
    });
    expect(payload.data.jobs).toHaveLength(2);
    expect(payload.data.jobs.map((job: { uid: string }) => job.uid)).toEqual([
      'user_a',
      'user_b',
    ]);
  });

  it('stage=ready returns only ready sessions', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });

    await GET(makeRequest('http://localhost:3000/api/admin/fix-jobs?stage=ready'));

    expect(listFixSessionsForAdmin).toHaveBeenCalledWith({
      stage: 'ready',
      limit: 50,
      cursor: undefined,
    });
  });

  it('legacy doc without stage field appears under awaiting_access', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    listFixSessionsForAdmin.mockResolvedValue({
      jobs: [
        {
          sessionId: 'legacy_1',
          uid: 'user_legacy',
          stage: 'awaiting_access',
          customerName: 'Legacy',
          customerEmail: 'legacy@test.com',
          siteUrl: 'https://legacy.test',
          entitlements: [],
          nextAction: 'Waiting on customer access',
          updatedAt: '2026-07-09T08:00:00.000Z',
          signalsTotal: 0,
          signalsDone: 0,
        },
      ],
    });

    const response = await GET(
      makeRequest('http://localhost:3000/api/admin/fix-jobs?stage=awaiting_access')
    );
    const payload = await response.json();

    expect(payload.data.jobs[0].stage).toBe('awaiting_access');
  });

  it('response payload contains no credential/token/narrative fields', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    listFixSessionsForAdmin.mockResolvedValue({
      jobs: [
        {
          sessionId: 'ord_1',
          uid: 'user_1',
          stage: 'qa',
          customerName: 'Jane',
          customerEmail: 'jane@test.com',
          siteUrl: 'https://jane.test',
          entitlements: ['seo_ai_visibility'],
          nextAction: 'Complete QA checklist',
          updatedAt: '2026-07-09T11:00:00.000Z',
          signalsTotal: 4,
          signalsDone: 4,
        },
      ],
    });

    const response = await GET(
      makeRequest('http://localhost:3000/api/admin/fix-jobs?stage=all')
    );
    const body = await response.text();

    expect(body).not.toContain('credentials');
    expect(body).not.toContain('accessToken');
    expect(body).not.toContain('grantToken');
    expect(body).not.toContain('encryptedCredentials');
    expect(body).not.toContain('speedNarrative');
    expect(body).not.toContain('securityNarrative');
    expect(body).not.toContain('seoNarrative');
    expect(body).not.toContain('auditLeadId');
  });

  it('pagination: limit=2 with 3 docs returns 2 items + nextCursor', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    listFixSessionsForAdmin.mockResolvedValue({
      jobs: [
        {
          sessionId: 's1',
          uid: 'u1',
          stage: 'ready',
          customerName: 'One',
          customerEmail: '1@test.com',
          siteUrl: 'https://1.test',
          entitlements: ['speed'],
          nextAction: 'Start Phase 0',
          updatedAt: '2026-07-09T12:00:00.000Z',
          signalsTotal: 1,
          signalsDone: 0,
        },
        {
          sessionId: 's2',
          uid: 'u2',
          stage: 'ready',
          customerName: 'Two',
          customerEmail: '2@test.com',
          siteUrl: 'https://2.test',
          entitlements: ['speed'],
          nextAction: 'Start Phase 0',
          updatedAt: '2026-07-09T11:00:00.000Z',
          signalsTotal: 1,
          signalsDone: 0,
        },
      ],
      nextCursor: '2026-07-09T11:00:00.000Z',
    });

    const response = await GET(
      makeRequest('http://localhost:3000/api/admin/fix-jobs?stage=all&limit=2')
    );
    const payload = await response.json();

    expect(listFixSessionsForAdmin).toHaveBeenCalledWith({
      stage: 'all',
      limit: 2,
      cursor: undefined,
    });
    expect(payload.data.jobs).toHaveLength(2);
    expect(payload.data.nextCursor).toBe('2026-07-09T11:00:00.000Z');
  });
});
