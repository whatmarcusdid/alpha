import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  applyRateLimit,
  requireAdmin,
  runAuditPipeline,
  sessionGet,
  sessionUpdate,
  userGet,
  auditLeadGet,
} = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  requireAdmin: vi.fn(),
  runAuditPipeline: vi.fn(),
  sessionGet: vi.fn(),
  sessionUpdate: vi.fn(),
  userGet: vi.fn(),
  auditLeadGet: vi.fn(),
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  adminRerunChecksLimiter: {},
  applyRateLimit,
  getRateLimitHeaders: () => ({ 'Retry-After': '60' }),
}));

vi.mock('@/lib/audit/runAuditPipeline', () => ({
  runAuditPipeline,
}));

vi.mock('@/lib/audit/gemini', () => ({
  getSEONarrative: vi.fn(),
  getAuditNarratives: vi.fn(),
}));

vi.mock('@/lib/pdf/generateAuditPDF', () => ({
  generateAuditPDF: vi.fn(),
}));

vi.mock('@/lib/loops', () => ({
  sendAuditReportEmail: vi.fn(),
}));

vi.mock('@/lib/slack', () => ({
  sendAuditLeadNotification: vi.fn(),
}));

vi.mock('@/lib/notion', () => ({
  createAuditLeadRecord: vi.fn(),
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

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => ({ __type: 'serverTimestamp' }),
  },
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: vi.fn((uid: string) => ({
            get: userGet,
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: sessionGet,
                update: sessionUpdate,
              })),
            })),
          })),
        };
      }

      if (name === 'auditLeads') {
        return {
          doc: vi.fn(() => ({
            get: auditLeadGet,
            update: vi.fn(),
            set: vi.fn(),
            add: vi.fn(),
          })),
        };
      }

      return { doc: vi.fn(), add: vi.fn() };
    }),
  },
}));

import { POST } from '@/app/api/admin/fix-jobs/[fixJobId]/rerun-checks/route';
import { getSEONarrative, getAuditNarratives } from '@/lib/audit/gemini';
import { generateAuditPDF } from '@/lib/pdf/generateAuditPDF';
import { sendAuditReportEmail } from '@/lib/loops';
import { sendAuditLeadNotification } from '@/lib/slack';
import { createAuditLeadRecord } from '@/lib/notion';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/admin/fix-jobs/s1/rerun-checks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

const fullPipeline = {
  speed: {
    status: 'completed' as const,
    data: { grade: 'A', score: 95, topIssues: [] },
  },
  security: {
    status: 'completed' as const,
    data: { grade: 'B', flags: ['no_https'], flagTier: 'advisory' },
  },
  seo: {
    status: 'completed' as const,
    data: { grade: 'C', score: 70, failingSignals: ['missing_title'] },
  },
};

describe('POST /api/admin/fix-jobs/[fixJobId]/rerun-checks', () => {
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
    sessionGet.mockResolvedValue({
      exists: true,
      data: () => ({ auditLeadId: 'audit_1' }),
    });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        siteFix: { entitlements: ['speed', 'security', 'seo_ai_visibility'] },
      }),
    });
    auditLeadGet.mockResolvedValue({
      exists: true,
      data: () => ({
        websiteUrl: 'https://from-audit-lead.example',
        auditLeadId: 'audit_1',
      }),
    });
    sessionUpdate.mockResolvedValue(undefined);
    runAuditPipeline.mockResolvedValue(fullPipeline);
  });

  it('non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(403);
  });

  it('missing session → 404', async () => {
    sessionGet.mockResolvedValue({ exists: false });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(404);
  });

  it('URL from auditLead, not request body — body URL is ignored', async () => {
    const response = await POST(
      makePostRequest({
        uid: 'user_1',
        websiteUrl: 'https://evil.example',
      }),
      { params: Promise.resolve({ fixJobId: 's1' }) }
    );

    expect(response.status).toBe(200);
    expect(runAuditPipeline).toHaveBeenCalledWith(
      'https://from-audit-lead.example',
      expect.any(Object)
    );
  });

  it('speed-only entitlement: only speed pipeline called, only afterAudit.speed stored', async () => {
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({ siteFix: { entitlements: ['speed'] } }),
    });
    runAuditPipeline.mockResolvedValue({
      speed: fullPipeline.speed,
    });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runAuditPipeline).toHaveBeenCalledWith('https://from-audit-lead.example', {
      speed: true,
      security: false,
      seo: false,
    });
    expect(body.data.afterAudit.speed).toBeDefined();
    expect(body.data.afterAudit.security).toBeUndefined();
    expect(body.data.afterAudit.seo).toBeUndefined();
  });

  it('security pipeline throw → afterAudit.security.status: "failed", speed/seo stored normally', async () => {
    runAuditPipeline.mockResolvedValue({
      speed: fullPipeline.speed,
      security: { status: 'failed', error: 'scan down' },
      seo: fullPipeline.seo,
    });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });
    const body = await response.json();

    expect(body.data.afterAudit.security.status).toBe('failed');
    expect(body.data.afterAudit.speed.status).toBe('completed');
    expect(body.data.afterAudit.seo.status).toBe('completed');
  });

  it('no auditLeads write, no Gemini, no PDF, no Loops, no Slack (mock assertions)', async () => {
    const auditLeadUpdate = vi.fn();
    const auditLeadAdd = vi.fn();

    await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(getSEONarrative).not.toHaveBeenCalled();
    expect(getAuditNarratives).not.toHaveBeenCalled();
    expect(generateAuditPDF).not.toHaveBeenCalled();
    expect(sendAuditReportEmail).not.toHaveBeenCalled();
    expect(sendAuditLeadNotification).not.toHaveBeenCalled();
    expect(createAuditLeadRecord).not.toHaveBeenCalled();
    expect(auditLeadUpdate).not.toHaveBeenCalled();
    expect(auditLeadAdd).not.toHaveBeenCalled();
    expect(sessionUpdate).toHaveBeenCalledTimes(1);
  });

  it('second re-run overwrites first afterAudit entirely', async () => {
    runAuditPipeline
      .mockResolvedValueOnce({
        speed: {
          status: 'completed',
          data: { grade: 'B', score: 80, topIssues: ['lcp_slow'] },
        },
      })
      .mockResolvedValueOnce({
        speed: {
          status: 'completed',
          data: { grade: 'A', score: 95, topIssues: [] },
        },
      });

    userGet.mockResolvedValue({
      exists: true,
      data: () => ({ siteFix: { entitlements: ['speed'] } }),
    });

    await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });
    await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(sessionUpdate).toHaveBeenCalledTimes(2);
    const firstUpdate = sessionUpdate.mock.calls[0][0];
    const secondUpdate = sessionUpdate.mock.calls[1][0];

    expect(firstUpdate.afterAudit.speed.grade).toBe('B');
    expect(secondUpdate.afterAudit.speed.grade).toBe('A');
    expect(secondUpdate.afterAudit.speed.topIssues).toEqual([]);
  });

  it('rate limit: 6th call/min → 429', async () => {
    applyRateLimit.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST(makePostRequest({ uid: 'user_1' }), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(429);
    expect(runAuditPipeline).not.toHaveBeenCalled();
  });
});
