import { beforeEach, describe, expect, it, vi } from 'vitest';

const { docGet, docUpdate } = vi.hoisted(() => ({
  docGet: vi.fn(),
  docUpdate: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: docGet,
        update: docUpdate,
      })),
    })),
  },
}));

import { revokeSiteAccessRequest } from '@/lib/site-access/revoke-site-access-request';

describe('revokeSiteAccessRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docUpdate.mockResolvedValue(undefined);
  });

  it('mismatched clientUid → 403', async () => {
    docGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        clientUid: 'user_1',
        status: 'granted',
      }),
    });

    const result = await revokeSiteAccessRequest({
      requestId: 'req_1',
      uid: 'user_2',
    });

    expect(result).toEqual({
      success: false,
      status: 403,
      error: 'Forbidden',
    });
  });

  it('already revoked → 409', async () => {
    docGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        clientUid: 'user_1',
        status: 'revoked',
      }),
    });

    const result = await revokeSiteAccessRequest({
      requestId: 'req_1',
      uid: 'user_1',
    });

    expect(result).toEqual({
      success: false,
      status: 409,
      error: 'Already revoked',
    });
  });

  it('valid revoke: status becomes revoked, revokedAt set', async () => {
    docGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        clientUid: 'user_1',
        status: 'granted',
      }),
    });

    const result = await revokeSiteAccessRequest({
      requestId: 'req_1',
      uid: 'user_1',
    });

    expect(result).toEqual({ success: true });
    expect(docUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'revoked',
        revokedAt: expect.anything(),
      })
    );
  });
});
