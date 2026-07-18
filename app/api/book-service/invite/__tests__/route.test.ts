import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = 'uid_invite_owner';
const OTHER_USER_ID = 'uid_other';
const ORDER_ID = 'order_invite_123';
const EMAIL = 'owner@example.com';

const { mockVerifyIdToken, mockProcessDashboardInvite } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockProcessDashboardInvite: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
  adminDb: null,
}));

vi.mock('@/lib/book-service/dashboard-invite', () => ({
  processDashboardInvite: (...args: unknown[]) => mockProcessDashboardInvite(...args),
}));

import { POST } from '@/app/api/book-service/invite/route';

function makeRequest(
  body: Record<string, unknown>,
  authorization?: string
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  return new NextRequest('http://localhost:3000/api/book-service/invite', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/book-service/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: USER_ID });
    mockProcessDashboardInvite.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('rejects CRON_SECRET bearer token like any invalid auth (no bypass)', async () => {
    process.env.CRON_SECRET = 'shared-cron-secret';
    mockVerifyIdToken.mockRejectedValue({
      code: 'auth/argument-error',
      message: 'Decoding Firebase ID token failed',
    });

    const response = await POST(
      makeRequest(
        {
          userId: OTHER_USER_ID,
          email: EMAIL,
          orderId: ORDER_ID,
          sku: 'speed_fix',
        },
        'Bearer shared-cron-secret'
      )
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/Unauthorized|Invalid authentication token/i);
    expect(mockProcessDashboardInvite).not.toHaveBeenCalled();
  });

  it('allows authenticated invite when userId matches token', async () => {
    const response = await POST(
      makeRequest(
        {
          userId: USER_ID,
          email: EMAIL,
          orderId: ORDER_ID,
          sku: 'speed_fix',
        },
        'Bearer valid-firebase-token'
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockProcessDashboardInvite).toHaveBeenCalledWith({
      userId: USER_ID,
      email: EMAIL,
      orderId: ORDER_ID,
      sku: 'speed_fix',
    });
  });

  it('returns 403 when authenticated userId does not match body userId', async () => {
    const response = await POST(
      makeRequest(
        {
          userId: OTHER_USER_ID,
          email: EMAIL,
          orderId: ORDER_ID,
          sku: 'speed_fix',
        },
        'Bearer valid-firebase-token'
      )
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden' });
    expect(mockProcessDashboardInvite).not.toHaveBeenCalled();
  });
});
