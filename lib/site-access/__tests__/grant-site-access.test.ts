import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  tokenQueryGet,
  runTransaction,
  userGet,
  sendAccessGrantedNotificationEmail,
} = vi.hoisted(() => ({
  tokenQueryGet: vi.fn(),
  runTransaction: vi.fn(),
  userGet: vi.fn(),
  sendAccessGrantedNotificationEmail: vi.fn(),
}));

vi.mock('@/lib/site-access/emails', () => ({
  sendAccessGrantedNotificationEmail,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'siteAccessRequests') {
        return {
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: tokenQueryGet,
              })),
            })),
          })),
        };
      }

      if (name === 'users') {
        return {
          doc: vi.fn(() => ({
            get: userGet,
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
    runTransaction,
  },
}));

import { grantSiteAccess } from '@/lib/site-access/grant-site-access';
import { generateAccessToken, hashAccessToken } from '@/lib/site-access/token';

function makePendingDoc(rawToken: string, overrides: Record<string, unknown> = {}) {
  const ref = { id: 'req_1', path: 'siteAccessRequests/req_1' };
  return {
    empty: false,
    docs: [
      {
        id: 'req_1',
        ref,
        data: () => ({
          requestId: 'req_1',
          clientUid: 'user_1',
          sessionId: 'session_1',
          requestedAt: Timestamp.fromDate(new Date('2026-07-17T12:00:00.000Z')),
          requestedBy: 'admin_1',
          requestedByEmail: 'admin@example.com',
          accessType: 'wp_admin',
          scopeDescription: 'Submitted credentials expired.',
          expiryDays: 7,
          expiresAt: null,
          status: 'pending',
          grantedAt: null,
          revokedAt: null,
          tokenHash: hashAccessToken(rawToken),
          tokenUsed: false,
          ...overrides,
        }),
      },
    ],
  };
}

describe('grantSiteAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        fullName: 'Jane Doe',
        company: { legalName: 'Jane Co' },
      }),
    });
    sendAccessGrantedNotificationEmail.mockResolvedValue(undefined);
    runTransaction.mockImplementation(async (callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: 'pending',
            tokenUsed: false,
          }),
        }),
        update: vi.fn(),
      };
      await callback(transaction);
    });
  });

  it('invalid token → 400 (no reveal of which field failed)', async () => {
    tokenQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await grantSiteAccess('invalid-token');

    expect(result).toEqual({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });
  });

  it('already used token → 400', async () => {
    tokenQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await grantSiteAccess('used-token');

    expect(result).toEqual({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });
  });

  it('expired link (requestedAt > 7 days ago) → 400', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce(
      makePendingDoc(rawToken, {
        requestedAt: Timestamp.fromDate(new Date('2026-06-01T12:00:00.000Z')),
      })
    );

    const result = await grantSiteAccess(rawToken);

    expect(result).toEqual({
      success: false,
      status: 400,
      error: 'This access link has expired',
    });
  });

  it('valid grant: status becomes granted, grantedAt set, expiresAt calculated correctly', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce(makePendingDoc(rawToken));

    let capturedUpdate: Record<string, unknown> | undefined;
    runTransaction.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: 'pending',
            tokenUsed: false,
            expiryDays: 7,
          }),
        }),
        update: vi.fn((_ref, update) => {
          capturedUpdate = update;
        }),
      };
      await callback(transaction);
    });

    const result = await grantSiteAccess(rawToken);

    expect(result.success).toBe(true);
    if (result.success) {
      const expiresAt = new Date(result.expiresAt);
      const grantedAt = (capturedUpdate?.grantedAt as Timestamp).toDate();
      const diffDays = Math.round(
        (expiresAt.getTime() - grantedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(capturedUpdate?.status).toBe('granted');
      expect(capturedUpdate?.tokenUsed).toBe(true);
      expect(diffDays).toBe(7);
    }
  });

  it('valid grant: tokenUsed becomes true', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce(makePendingDoc(rawToken));

    let capturedUpdate: Record<string, unknown> | undefined;
    runTransaction.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'pending', tokenUsed: false, expiryDays: 7 }),
        }),
        update: vi.fn((_ref, update) => {
          capturedUpdate = update;
        }),
      };
      await callback(transaction);
    });

    await grantSiteAccess(rawToken);
    expect(capturedUpdate?.tokenUsed).toBe(true);
  });

  it('valid grant: admin notification email fired (mock)', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce(makePendingDoc(rawToken));

    await grantSiteAccess(rawToken);

    await vi.waitFor(() => {
      expect(sendAccessGrantedNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          adminEmail: 'admin@example.com',
          customerName: 'Jane Doe',
          businessName: 'Jane Co',
          sessionId: 'session_1',
          accessType: 'wp_admin',
        })
      );
    });
  });

  it('valid grant: second grant attempt with same token → 400', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await grantSiteAccess(rawToken);

    expect(result).toEqual({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });
  });
});
