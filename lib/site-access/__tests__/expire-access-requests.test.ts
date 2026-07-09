import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryGet, batchUpdate, batchCommit } = vi.hoisted(() => ({
  queryGet: vi.fn(),
  batchUpdate: vi.fn(),
  batchCommit: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          get: queryGet,
        })),
      })),
    })),
    batch: vi.fn(() => ({
      update: batchUpdate,
      commit: batchCommit,
    })),
  },
}));

import { expireGrantedAccessRequests } from '@/lib/site-access/expire-access-requests';

describe('expireGrantedAccessRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    batchCommit.mockResolvedValue(undefined);
  });

  it('expires requests where expiresAt <= now and status === granted', async () => {
    queryGet.mockResolvedValueOnce({
      empty: false,
      size: 2,
      docs: [{ ref: { id: 'req_1' } }, { ref: { id: 'req_2' } }],
    });

    const result = await expireGrantedAccessRequests();

    expect(result).toEqual({ expired: 2 });
    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenCalledWith({ id: 'req_1' }, { status: 'expired' });
    expect(batchCommit).toHaveBeenCalled();
  });

  it('does not expire requests where expiresAt > now', async () => {
    queryGet.mockResolvedValueOnce({ empty: true, size: 0, docs: [] });

    const result = await expireGrantedAccessRequests();

    expect(result).toEqual({ expired: 0 });
    expect(batchUpdate).not.toHaveBeenCalled();
  });

  it('does not touch pending, declined, or revoked requests', async () => {
    queryGet.mockResolvedValueOnce({ empty: true, size: 0, docs: [] });

    await expireGrantedAccessRequests();

    expect(queryGet).toHaveBeenCalled();
    expect(batchUpdate).not.toHaveBeenCalled();
  });

  it('returns correct expired count', async () => {
    queryGet.mockResolvedValueOnce({
      empty: false,
      size: 1,
      docs: [{ ref: { id: 'req_1' } }],
    });

    const result = await expireGrantedAccessRequests();
    expect(result.expired).toBe(1);
    expect(Timestamp.now()).toBeTruthy();
  });
});
