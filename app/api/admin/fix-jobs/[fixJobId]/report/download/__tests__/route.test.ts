import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getReportDownloadStream, requireAdmin, adminDbGet } = vi.hoisted(() => ({
  getReportDownloadStream: vi.fn(),
  requireAdmin: vi.fn(),
  adminDbGet: vi.fn(),
}));

vi.mock('@/lib/storage/adminStorage', () => ({
  getReportDownloadStream,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: adminDbGet,
          }),
        }),
      }),
    }),
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

import { GET } from '@/app/api/admin/fix-jobs/[fixJobId]/report/download/route';

function makeGetRequest(uid: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/admin/fix-jobs/s1/report/download?uid=${uid}`
  );
}

describe('GET /api/admin/fix-jobs/[fixJobId]/report/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
  });

  it('non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await GET(makeGetRequest('user_1'), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(403);
  });

  it('no report generated → 404', async () => {
    adminDbGet.mockResolvedValue({
      exists: true,
      data: () => ({ report: { status: 'not_generated' } }),
    });

    const response = await GET(makeGetRequest('user_1'), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(404);
  });

  it('after regenerate: streams latest artifact, not previous', async () => {
    adminDbGet.mockResolvedValue({
      exists: true,
      data: () => ({ report: { status: 'generated', reportId: 'report_latest' } }),
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });

    getReportDownloadStream.mockResolvedValueOnce(stream);

    const response = await GET(makeGetRequest('user_1'), {
      params: Promise.resolve({ fixJobId: 's1' }),
    });

    expect(response.status).toBe(200);
    expect(getReportDownloadStream).toHaveBeenCalledWith(
      'user_1',
      's1',
      'report_latest'
    );
  });
});
