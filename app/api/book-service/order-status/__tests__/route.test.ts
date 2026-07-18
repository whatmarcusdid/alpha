import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EMAIL_A = 'owner@example.com';
const EMAIL_B = 'attacker@example.com';
const ORDER_ID = 'order_owner_123';
const AUDIT_LEAD_ID = 'audit_lead_123';

const orderStore = new Map<
  string,
  {
    orderId: string;
    auditLeadId: string;
    sku: string;
    entitlements: string[];
    normalizedEmail: string;
    createdAt: { toDate: () => Date };
  }
>();

const auditLeadStore = new Map<
  string,
  {
    firstName: string;
    email: string;
    websiteUrl: string;
  }
>();

const { mockOrderGet, mockAuditLeadGet } = vi.hoisted(() => ({
  mockOrderGet: vi.fn(),
  mockAuditLeadGet: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: null,
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: () =>
          name === 'orders'
            ? mockOrderGet(id)
            : mockAuditLeadGet(id),
      }),
    }),
  },
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  generalLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

import { GET } from '@/app/api/book-service/order-status/route';

function makeRequest(orderId: string, email?: string): NextRequest {
  const params = new URLSearchParams({ orderId });
  if (email) {
    params.set('email', email);
  }

  return new NextRequest(
    `http://localhost:3000/api/book-service/order-status?${params.toString()}`
  );
}

describe('GET /api/book-service/order-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderStore.clear();
    auditLeadStore.clear();

    orderStore.set(ORDER_ID, {
      orderId: ORDER_ID,
      auditLeadId: AUDIT_LEAD_ID,
      sku: 'speed_fix',
      entitlements: ['speed'],
      normalizedEmail: EMAIL_A,
      createdAt: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
    });

    auditLeadStore.set(AUDIT_LEAD_ID, {
      firstName: 'Owner',
      email: EMAIL_A,
      websiteUrl: 'https://owner.example.com',
    });

    mockOrderGet.mockImplementation(async (id: string) => {
      const data = orderStore.get(id);
      return {
        exists: Boolean(data),
        data: () => data,
      };
    });

    mockAuditLeadGet.mockImplementation(async (id: string) => {
      const data = auditLeadStore.get(id);
      return {
        exists: Boolean(data),
        data: () => data,
      };
    });
  });

  it('denies unauthenticated lookup without email (IDOR exploit)', async () => {
    const response = await GET(makeRequest(ORDER_ID));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTruthy();
    expect(mockAuditLeadGet).not.toHaveBeenCalled();
  });

  it('denies lookup with wrong email (IDOR exploit)', async () => {
    const response = await GET(makeRequest(ORDER_ID, EMAIL_B));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden' });
  });

  it('allows legitimate lookup when checkout email matches the order', async () => {
    const response = await GET(makeRequest(ORDER_ID, `  ${EMAIL_A.toUpperCase()}  `));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      orderId: ORDER_ID,
      sku: 'speed_fix',
      normalizedEmail: EMAIL_A,
      firstName: 'Owner',
      websiteUrl: 'https://owner.example.com',
    });
  });

  it('returns 404 for unknown order without leaking email mismatch shape', async () => {
    const response = await GET(makeRequest('missing-order', EMAIL_A));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ success: false, error: 'Order not found' });
  });
});
