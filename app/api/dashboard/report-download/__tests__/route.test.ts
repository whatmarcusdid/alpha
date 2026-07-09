import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getReportDownloadStream, requireAuth, adminDbGet } = vi.hoisted(() => ({
  getReportDownloadStream: vi.fn(),
  requireAuth: vi.fn(),
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
  requireAuth,
  isAuthError: (result: unknown) => result instanceof NextResponse,
}));

vi.mock('@/lib/middleware/apiHandler', async () => {
  const auth = await import('@/lib/middleware/auth');
  return {
    withAuth: (
      handler: (
        req: NextRequest,
        context: { userId: string }
      ) => Promise<NextResponse>
    ) => {
      return async (req: NextRequest) => {
        const result = await auth.requireAuth(req);
        if (auth.isAuthError(result)) {
          return result;
        }

        return handler(req, { userId: (result as { userId: string }).userId });
      };
    },
  };
});

import { GET } from '@/app/api/dashboard/report-download/route';

function makeGetRequest(sessionId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/dashboard/report-download?sessionId=${sessionId}`
  );
}

describe('GET /api/dashboard/report-download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ userId: 'user_1' });
  });

  it('wrong uid → 404 when session missing for token uid', async () => {
    adminDbGet.mockResolvedValue({ exists: false });

    const response = await GET(makeGetRequest('s1'));

    expect(response.status).toBe(404);
  });

  it('status not_generated → 403', async () => {
    adminDbGet.mockResolvedValue({
      exists: true,
      data: () => ({ report: { status: 'not_generated' } }),
    });

    const response = await GET(makeGetRequest('s1'));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Report not yet available');
  });

  it('status generated (not yet sent) → 403', async () => {
    adminDbGet.mockResolvedValue({
      exists: true,
      data: () => ({ report: { status: 'generated', reportId: 'r1' } }),
    });

    const response = await GET(makeGetRequest('s1'));

    expect(response.status).toBe(403);
  });

  it('status sent + correct uid → streams PDF', async () => {
    adminDbGet.mockResolvedValue({
      exists: true,
      data: () => ({ report: { status: 'sent', reportId: 'r1' } }),
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    getReportDownloadStream.mockResolvedValueOnce(stream);

    const response = await GET(makeGetRequest('s1'));

    expect(response.status).toBe(200);
    expect(getReportDownloadStream).toHaveBeenCalledWith('user_1', 's1', 'r1');
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });
});
