import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SENSITIVE_MESSAGE = 'super-secret-access-reminder-failure-xyz';

vi.mock('@/lib/book-service/send-access-reminders', () => ({
  sendSiteFixAccessReminders: vi.fn(async () => {
    throw new Error(SENSITIVE_MESSAGE);
  }),
}));

import { GET as sendAccessRemindersGET } from '@/app/api/cron/send-access-reminders/route';

describe('production error sanitization', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('cron/send-access-reminders omits internal error.message in production', async () => {
    const response = await sendAccessRemindersGET(
      new NextRequest('http://localhost:3000/api/cron/send-access-reminders')
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to send access reminders');
    expect(JSON.stringify(body)).not.toContain(SENSITIVE_MESSAGE);
    expect(body.details).toBeUndefined();
  });
});
