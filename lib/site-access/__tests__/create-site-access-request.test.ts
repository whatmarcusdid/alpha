import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  adminDbSessionGet,
  adminDbUserGet,
  pendingQueryGet,
  docSet,
  docRefId,
  adminAuthGetUser,
  sendAccessReRequestEmail,
} = vi.hoisted(() => ({
  adminDbSessionGet: vi.fn(),
  adminDbUserGet: vi.fn(),
  pendingQueryGet: vi.fn(),
  docSet: vi.fn(),
  docRefId: 'req_auto_1',
  adminAuthGetUser: vi.fn(),
  sendAccessReRequestEmail: vi.fn(),
}));

vi.mock('@/lib/site-access/emails', () => ({
  sendAccessReRequestEmail,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: vi.fn((uid: string) => ({
            get: adminDbUserGet,
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: adminDbSessionGet,
              })),
            })),
          })),
        };
      }

      if (name === 'siteAccessRequests') {
        return {
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => ({
                  get: pendingQueryGet,
                })),
              })),
            })),
          })),
          doc: vi.fn(() => ({
            id: docRefId,
            set: docSet,
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  },
  adminAuth: {
    getUser: adminAuthGetUser,
  },
}));

import {
  createSiteAccessRequest,
  SITE_ACCESS_REQUESTS_COLLECTION,
} from '@/lib/site-access/create-site-access-request';
import { hashAccessToken } from '@/lib/site-access/token';

describe('createSiteAccessRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminDbSessionGet.mockResolvedValue({ exists: true });
    adminDbUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        email: 'client@example.com',
        fullName: 'Jane Doe',
        company: { legalName: 'Jane Co' },
      }),
    });
    pendingQueryGet.mockResolvedValue({ empty: true, docs: [] });
    docSet.mockResolvedValue(undefined);
    adminAuthGetUser.mockResolvedValue({ email: 'admin@example.com' });
    sendAccessReRequestEmail.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  it('missing session → 404', async () => {
    adminDbSessionGet.mockResolvedValueOnce({ exists: false });

    const result = await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      expiryDays: 7,
    });

    expect(result).toEqual({
      success: false,
      status: 404,
      error: 'Fix job not found',
    });
  });

  it('existing pending request for same session → 409', async () => {
    pendingQueryGet.mockResolvedValueOnce({ empty: false, docs: [{ id: 'existing' }] });

    const result = await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      expiryDays: 7,
    });

    expect(result).toEqual({
      success: false,
      status: 409,
      error: 'A pending access request already exists for this job',
    });
  });

  it('valid request: siteAccessRequests doc created with correct fields', async () => {
    const result = await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'hosting_panel',
      scopeDescription: 'Submitted hosting panel credentials expired and need to be renewed.',
      expiryDays: 14,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.requestId).toBe(docRefId);
      expect(result.accessToken).toEqual(expect.any(String));
    }
    expect(docSet).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: docRefId,
        clientUid: 'user_1',
        sessionId: 'session_1',
        requestedBy: 'admin_1',
        requestedByEmail: 'admin@example.com',
        accessType: 'hosting_panel',
        scopeDescription:
          'Submitted hosting panel credentials expired and need to be renewed.',
        expiryDays: 14,
        expiresAt: null,
        status: 'pending',
        grantedAt: null,
        revokedAt: null,
        tokenUsed: false,
      })
    );
  });

  it('valid request: tokenHash stored, raw token not stored', async () => {
    await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      expiryDays: 7,
    });

    const writePayload = docSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(typeof writePayload.tokenHash).toBe('string');
    expect(writePayload.tokenHash).toHaveLength(64);
    expect(writePayload).not.toHaveProperty('token');
    expect(writePayload).not.toHaveProperty('rawToken');
    expect(writePayload).not.toHaveProperty('grantToken');
  });

  it('valid request: Loops email fired (mock)', async () => {
    await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      expiryDays: 7,
    });

    await vi.waitFor(() => {
      expect(sendAccessReRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'client@example.com',
          customerName: 'Jane Doe',
          businessName: 'Jane Co',
          grantUrl: expect.stringContaining('/book-service/access-request/grant?token='),
          declineUrl: expect.stringContaining('/book-service/access-request/decline?token='),
        })
      );
    });
  });

  it('valid request: returns requestId', async () => {
    const result = await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      expiryDays: 7,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.requestId).toBe(docRefId);
    }
  });

  it('writes to siteAccessRequests collection path', async () => {
    await createSiteAccessRequest({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress credentials no longer work for this job.',
      expiryDays: 7,
    });

    expect(SITE_ACCESS_REQUESTS_COLLECTION).toBe('siteAccessRequests');
    expect(docSet).toHaveBeenCalled();
    expect(hashAccessToken('anything')).toHaveLength(64);
  });
});
