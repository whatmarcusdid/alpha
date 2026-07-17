import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listUnlinkedAuditLeadRecords, requireAdmin } = vi.hoisted(() => ({
  listUnlinkedAuditLeadRecords: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/admin/list-unlinked-audit-leads', () => ({
  listUnlinkedAuditLeadRecords,
}));

vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin,
  isAdminAuthError: (result: unknown) => result instanceof NextResponse,
}));

vi.mock('@/lib/middleware/apiHandler', async () => {
  const auth = await import('@/lib/middleware/auth');
  return {
    withAdmin: (handler: () => Promise<NextResponse>) => {
      return async (req: NextRequest) => {
        const result = await auth.requireAdmin(req);
        if (auth.isAdminAuthError(result)) {
          return result;
        }
        return handler();
      };
    },
  };
});

import { GET } from '@/app/api/admin/unlinked-audit-leads/route';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/unlinked-audit-leads', {
    headers,
  });
}

describe('GET /api/admin/unlinked-audit-leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listUnlinkedAuditLeadRecords.mockResolvedValue([]);
  });

  it('unauthenticated request → 401', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('authenticated non-admin → 403', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const response = await GET(
      makeRequest({ Authorization: 'Bearer token' })
    );
    expect(response.status).toBe(403);
  });

  it('returns unlinked records for admin callers', async () => {
    requireAdmin.mockResolvedValue({ userId: 'admin_1', isAdmin: true as const });
    listUnlinkedAuditLeadRecords.mockResolvedValue([
      {
        type: 'order',
        recordId: 'order-1',
        customerEmail: 'buyer@example.com',
        sku: 'Speed Fix',
        createdAt: '2026-07-17T12:00:00.000Z',
        auditLeadId: 'audit-lead-missing',
      },
    ]);

    const response = await GET(makeRequest({ Authorization: 'Bearer token' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(listUnlinkedAuditLeadRecords).toHaveBeenCalledTimes(1);
  });
});
