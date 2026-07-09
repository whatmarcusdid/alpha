import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getFixJobDetail, requireAdmin, applyRateLimit, adminDbAdd, decryptSecret } =
  vi.hoisted(() => ({
    getFixJobDetail: vi.fn(),
    requireAdmin: vi.fn(),
    applyRateLimit: vi.fn(),
    adminDbAdd: vi.fn(),
    decryptSecret: vi.fn(),
  }));

vi.mock('@/lib/fix-jobs/get-fix-job-detail', () => ({
  getFixJobDetail,
}));

vi.mock('@/lib/book-service/encryption', () => ({
  decryptSecret,
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  adminCredentialsLimiter: {},
  applyRateLimit,
  getRateLimitHeaders: () => ({}),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(),
          })),
        })),
        get: vi.fn(),
      })),
      add: adminDbAdd,
    })),
  },
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

import { GET } from '@/app/api/admin/fix-jobs/[fixJobId]/route';
import { POST as POST_CREDENTIALS } from '@/app/api/admin/fix-jobs/[fixJobId]/credentials/route';

const sampleDetail = {
  sessionId: 'order_1',
  uid: 'user_1',
  stage: 'ready',
  stageHistory: [],
  phase0Complete: false,
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  businessName: 'Jane Co',
  siteUrl: 'https://example.com',
  entitlements: ['security'],
  auditLeadId: 'audit_1',
  orderId: 'order_1',
  baseline: {
    speedGrade: 'C',
    speedTopIssues: [],
    securityGrade: 'D',
    securityFlags: ['no_https'],
    seoGrade: 'B',
    seoFailingSignals: [],
  },
  fixProgress: {
    no_https: {
      status: 'pending',
      completedStepIds: [],
      planSource: 'generic',
    },
  },
  qa: null,
  qaData: null,
  afterAudit: null,
  report: null,
  reportData: null,
  updatedAt: new Date().toISOString(),
  recentUpdates: [],
};

function makeGetRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { headers });
}

function makePostRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/fix-jobs/[sessionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET: unauthenticated → 401', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const response = await GET(
      makeGetRequest('http://localhost:3000/api/admin/fix-jobs/s1?uid=u1'),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(401);
  });

  it('GET: non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await GET(
      makeGetRequest('http://localhost:3000/api/admin/fix-jobs/s1?uid=u1'),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('GET: missing session → 404', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    getFixJobDetail.mockResolvedValue(null);

    const response = await GET(
      makeGetRequest('http://localhost:3000/api/admin/fix-jobs/s1?uid=u1'),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(404);
  });

  it('GET: payload contains no credential/token fields', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    getFixJobDetail.mockResolvedValue(sampleDetail);

    const response = await GET(
      makeGetRequest('http://localhost:3000/api/admin/fix-jobs/s1?uid=u1'),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(200);
    expect(body).not.toContain('encryptedCredentials');
    expect(body).not.toContain('accessToken');
    expect(body).not.toContain('grantToken');
    expect(body).not.toContain('passwordEncrypted');
    expect(body).not.toContain('speedNarrative');
  });

  it('GET: legacy doc without MVP-03 fields returns safe defaults', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    getFixJobDetail.mockResolvedValue({
      ...sampleDetail,
      stage: 'awaiting_access',
      fixProgress: {},
      phase0Complete: false,
      qa: null,
      afterAudit: null,
      report: null,
    });

    const response = await GET(
      makeGetRequest('http://localhost:3000/api/admin/fix-jobs/s1?uid=u1'),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    const payload = await response.json();
    expect(payload.data.stage).toBe('awaiting_access');
    expect(payload.data.fixProgress).toEqual({});
    expect(payload.data.phase0Complete).toBe(false);
    expect(payload.data.qa).toBeNull();
  });
});

describe('POST /api/admin/fix-jobs/[sessionId]/credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
    adminDbAdd.mockResolvedValue({ id: 'log_1' });
    decryptSecret.mockReturnValue('plain-password');
  });

  it('POST /credentials: non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await POST_CREDENTIALS(
      makePostRequest('http://localhost:3000/api/admin/fix-jobs/s1/credentials', {
        uid: 'user_1',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(403);
  });

  it('POST /credentials: successful call writes adminAuditLog entry', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });

    const sessionGet = vi.fn().mockResolvedValue({ exists: true });
    const userGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        siteFix: {
          access_request: {
            method: 'wp_admin',
            loginUrl: 'https://example.com/wp-admin',
            username: 'admin',
            passwordEncrypted: 'enc:payload',
            hostingProvider: 'SiteGround',
            notes: 'Use staging',
          },
        },
      }),
    });

    const { adminDb } = await import('@/lib/firebase/admin');
    vi.mocked(adminDb!.collection).mockImplementation((name: string) => {
      if (name === 'adminAuditLog') {
        return { add: adminDbAdd } as never;
      }

      return {
        doc: vi.fn((uid: string) => ({
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({ get: sessionGet })),
          })),
          get: uid === 'user_1' ? userGet : vi.fn(),
        })),
      } as never;
    });

    const response = await POST_CREDENTIALS(
      makePostRequest('http://localhost:3000/api/admin/fix-jobs/s1/credentials', {
        uid: 'user_1',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adminDbAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUid: 'admin_1',
        sessionId: 's1',
        clientUid: 'user_1',
      })
    );
  });

  it('POST /credentials: rate limit fires after 10 calls/min', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    applyRateLimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST_CREDENTIALS(
      makePostRequest('http://localhost:3000/api/admin/fix-jobs/s1/credentials', {
        uid: 'user_1',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(429);
  });
});
