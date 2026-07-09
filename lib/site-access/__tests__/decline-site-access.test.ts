import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { tokenQueryGet, runTransaction, sendAccessReRequestEmail } = vi.hoisted(() => ({
  tokenQueryGet: vi.fn(),
  runTransaction: vi.fn(),
  sendAccessReRequestEmail: vi.fn(),
}));

vi.mock('@/lib/site-access/emails', () => ({
  sendAccessReRequestEmail,
  sendAccessGrantedNotificationEmail: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: tokenQueryGet,
          })),
        })),
      })),
    })),
    runTransaction,
  },
}));

import { declineSiteAccess } from '@/lib/site-access/decline-site-access';
import { generateAccessToken, hashAccessToken } from '@/lib/site-access/token';

describe('declineSiteAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runTransaction.mockImplementation(async (callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'pending', tokenUsed: false }),
        }),
        update: vi.fn(),
      };
      await callback(transaction);
    });
  });

  it('invalid token → 400', async () => {
    tokenQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await declineSiteAccess('bad-token');

    expect(result).toEqual({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });
  });

  it('already used token → 400', async () => {
    tokenQueryGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await declineSiteAccess('used-token');

    expect(result).toEqual({
      success: false,
      status: 400,
      error: 'Invalid or expired access link',
    });
  });

  it('valid decline: status becomes declined, tokenUsed true', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'req_1',
          ref: { id: 'req_1' },
          data: () => ({
            status: 'pending',
            tokenUsed: false,
            tokenHash: hashAccessToken(rawToken),
            requestedAt: Timestamp.fromDate(new Date('2026-07-08T12:00:00.000Z')),
          }),
        },
      ],
    });

    let capturedUpdate: Record<string, unknown> | undefined;
    runTransaction.mockImplementationOnce(async (callback) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: 'pending', tokenUsed: false }),
        }),
        update: vi.fn((_ref, update) => {
          capturedUpdate = update;
        }),
      };
      await callback(transaction);
    });

    const result = await declineSiteAccess(rawToken);

    expect(result).toEqual({ success: true });
    expect(capturedUpdate).toEqual({
      status: 'declined',
      tokenUsed: true,
    });
  });

  it('valid decline: no email fired', async () => {
    const rawToken = generateAccessToken();
    tokenQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'req_1',
          ref: { id: 'req_1' },
          data: () => ({
            status: 'pending',
            tokenUsed: false,
            tokenHash: hashAccessToken(rawToken),
            requestedAt: Timestamp.fromDate(new Date('2026-07-08T12:00:00.000Z')),
          }),
        },
      ],
    });

    await declineSiteAccess(rawToken);

    expect(sendAccessReRequestEmail).not.toHaveBeenCalled();
  });
});
