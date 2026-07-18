import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map([['stripe-signature', 'invalid-signature']])),
}));

vi.mock('@sentry/nextjs', () => ({
  startSpan: (_opts: unknown, fn: (span: { setAttribute: () => void }) => unknown) =>
    fn({ setAttribute: () => {} }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: null,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

describe('POST /api/webhooks/stripe production error sanitization', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fixture';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_signing_key_1234567890';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not echo signature verification error.message in production', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(
      new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: '{"id":"evt_test"}',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Webhook signature verification failed');
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/Webhook Error:/);

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
