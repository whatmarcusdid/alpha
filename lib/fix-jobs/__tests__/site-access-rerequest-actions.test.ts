import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWithAdminAuth } = vi.hoisted(() => ({
  fetchWithAdminAuth: vi.fn(),
}));

vi.mock('@/lib/admin/fetch-with-auth', () => ({
  fetchWithAdminAuth,
}));

import {
  revokeSiteAccessReRequest,
  submitSiteAccessReRequest,
} from '@/lib/fix-jobs/site-access-rerequest-actions';
import type { SiteAccessRequestPayload } from '@/lib/types/site-access-request';

const currentRequest: SiteAccessRequestPayload = {
  requestId: 'req_1',
  clientUid: 'user_1',
  sessionId: 'session_1',
  requestedAt: '2026-07-08T12:00:00.000Z',
  accessType: 'wp_admin',
  scopeDescription: 'Submitted credentials expired mid-job.',
  expiryDays: 7,
  expiresAt: null,
  status: 'pending',
  grantedAt: null,
  revokedAt: null,
};

describe('site access re-request actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successful request returns pending payload', async () => {
    fetchWithAdminAuth.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { requestId: 'req_new' } }), {
        status: 200,
      })
    );

    const result = await submitSiteAccessReRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials expired mid-job.',
      expiryDays: 7,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.request.status).toBe('pending');
      expect(result.request.requestId).toBe('req_new');
    }
  });

  it('409 duplicate returns inline message payload', async () => {
    fetchWithAdminAuth.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'A pending access request already exists for this job',
        }),
        { status: 409 }
      )
    );

    const result = await submitSiteAccessReRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials expired mid-job.',
      expiryDays: 7,
    });

    expect(result).toEqual({
      success: false,
      status: 409,
      error: 'A re-request is already pending for this job.',
    });
  });

  it('successful revoke returns revoked payload', async () => {
    fetchWithAdminAuth.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const result = await revokeSiteAccessReRequest({
      requestId: 'req_1',
      uid: 'user_1',
      current: currentRequest,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.request.status).toBe('revoked');
      expect(result.request.revokedAt).toBeTruthy();
    }

    expect(fetchWithAdminAuth).toHaveBeenCalledWith(
      '/api/admin/site-access/req_1/revoke',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ uid: 'user_1' }),
      })
    );
  });
});
