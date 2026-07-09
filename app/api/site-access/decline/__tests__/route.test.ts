import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { declineSiteAccess, applyRateLimit } = vi.hoisted(() => ({
  declineSiteAccess: vi.fn(),
  applyRateLimit: vi.fn(),
}));

vi.mock('@/lib/site-access/decline-site-access', () => ({
  declineSiteAccess,
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  siteAccessGrantDeclineLimiter: {},
  applyRateLimit,
  getClientIdentifier: () => '127.0.0.1',
  getRateLimitHeaders: () => ({}),
}));

import { POST } from '@/app/api/site-access/decline/route';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/site-access/decline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/site-access/decline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
  });

  it('invalid token → 400', async () => {
    declineSiteAccess.mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });

    const response = await POST(makePostRequest({ token: 'bad-token' }));

    expect(response.status).toBe(400);
  });

  it('already used token → 400', async () => {
    declineSiteAccess.mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });

    const response = await POST(makePostRequest({ token: 'used-token' }));

    expect(response.status).toBe(400);
  });

  it('valid decline: success true', async () => {
    declineSiteAccess.mockResolvedValueOnce({ success: true });

    const response = await POST(makePostRequest({ token: 'valid-token' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  it('valid decline: no email fired', async () => {
    declineSiteAccess.mockResolvedValueOnce({ success: true });

    await POST(makePostRequest({ token: 'valid-token' }));

    expect(declineSiteAccess).toHaveBeenCalledWith('valid-token');
  });
});
