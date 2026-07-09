import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { grantSiteAccess, applyRateLimit } = vi.hoisted(() => ({
  grantSiteAccess: vi.fn(),
  applyRateLimit: vi.fn(),
}));

vi.mock('@/lib/site-access/grant-site-access', () => ({
  grantSiteAccess,
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  siteAccessGrantDeclineLimiter: {},
  applyRateLimit,
  getClientIdentifier: () => '127.0.0.1',
  getRateLimitHeaders: () => ({}),
}));

import { POST } from '@/app/api/site-access/grant/route';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/site-access/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/site-access/grant', () => {
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

  it('invalid token → 400 (no reveal of which field failed)', async () => {
    grantSiteAccess.mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });

    const response = await POST(makePostRequest({ token: 'bad-token' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid or expired access link');
  });

  it('already used token → 400', async () => {
    grantSiteAccess.mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'This access link has already been used',
    });

    const response = await POST(makePostRequest({ token: 'used-token' }));

    expect(response.status).toBe(400);
  });

  it('expired link (requestedAt > 7 days ago) → 400', async () => {
    grantSiteAccess.mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'This access link has expired',
    });

    const response = await POST(makePostRequest({ token: 'expired-token' }));

    expect(response.status).toBe(400);
  });

  it('valid grant: returns expiresAt', async () => {
    grantSiteAccess.mockResolvedValueOnce({
      success: true,
      expiresAt: '2026-07-16T12:00:00.000Z',
    });

    const response = await POST(makePostRequest({ token: 'valid-token' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: { expiresAt: '2026-07-16T12:00:00.000Z' },
    });
  });

  it('valid grant: second grant attempt with same token → 400', async () => {
    grantSiteAccess.mockResolvedValueOnce({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });

    const response = await POST(makePostRequest({ token: 'already-used' }));

    expect(response.status).toBe(400);
  });

  it('rate limit by IP: 11th call/min → 429', async () => {
    applyRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });

    const response = await POST(makePostRequest({ token: 'valid-token' }));

    expect(response.status).toBe(429);
  });
});
