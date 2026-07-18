import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EMAIL_A = 'owner@example.com';
const EMAIL_B = 'attacker@example.com';
const SESSION_ID = 'cs_test_owner_session';

const { mockSessionsRetrieve } = vi.hoisted(() => ({
  mockSessionsRetrieve: vi.fn(),
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  generalLimiter: null,
  checkRateLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]) => mockSessionsRetrieve(...args),
      },
    },
  })),
}));

import { POST } from '@/app/api/stripe/get-session-amount/route';

function makeRequest(sessionId: string, email: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/get-session-amount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, email }),
  });
}

describe('POST /api/stripe/get-session-amount', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSessionsRetrieve.mockResolvedValue({
      created: Math.floor(Date.now() / 1000),
      amount_total: 89900,
      currency: 'usd',
      payment_status: 'unpaid',
      customer_email: EMAIL_A,
      customer_details: { email: EMAIL_A },
      metadata: { tier: 'essential' },
    });
  });

  it('denies unauthenticated caller with wrong email (IDOR exploit)', async () => {
    const response = await POST(makeRequest(SESSION_ID, EMAIL_B));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('allows pre-signup lookup when email matches checkout session', async () => {
    const response = await POST(makeRequest(SESSION_ID, EMAIL_A.toUpperCase()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.amountTotal).toBe(89900);
    expect(body.tier).toBe('essential');
    expect(body.customerEmail).toBe(EMAIL_A);
  });

  it('denies lookup when session has no email to bind against', async () => {
    mockSessionsRetrieve.mockResolvedValue({
      created: Math.floor(Date.now() / 1000),
      amount_total: 89900,
      currency: 'usd',
      payment_status: 'unpaid',
      metadata: { tier: 'essential' },
    });

    const response = await POST(makeRequest(SESSION_ID, EMAIL_A));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });
});
