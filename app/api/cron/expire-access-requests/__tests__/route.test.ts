import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SENSITIVE_MESSAGE = 'super-secret-internal-stripe-failure-xyz';

vi.mock('@/lib/site-access/expire-access-requests', () => ({
  expireGrantedAccessRequests: vi.fn(async () => {
    throw new Error(SENSITIVE_MESSAGE);
  }),
}));

import { GET as expireAccessRequestsGET } from '@/app/api/cron/expire-access-requests/route';

describe('production error sanitization', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('cron/expire-access-requests omits internal error.message in production', async () => {
    const response = await expireAccessRequestsGET(
      new NextRequest('http://localhost:3000/api/cron/expire-access-requests')
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to expire access requests');
    expect(JSON.stringify(body)).not.toContain(SENSITIVE_MESSAGE);
    expect(body.details).toBeUndefined();
  });
});
