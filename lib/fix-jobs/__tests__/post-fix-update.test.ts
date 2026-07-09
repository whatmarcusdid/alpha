import { FieldValue } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminDbSessionGet, adminDbUpdate, adminDbAdd } = vi.hoisted(() => ({
  adminDbSessionGet: vi.fn(),
  adminDbUpdate: vi.fn(),
  adminDbAdd: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: vi.fn(() => ({
            collection: vi.fn((sub: string) => {
              if (sub === 'fixSessions') {
                return {
                  doc: vi.fn(() => ({
                    get: adminDbSessionGet,
                    update: adminDbUpdate,
                  })),
                };
              }

              if (sub === 'fixUpdates') {
                return {
                  add: adminDbAdd,
                };
              }

              return {};
            }),
          })),
        };
      }

      return {};
    }),
  },
}));

import { postFixUpdate } from '@/lib/fix-jobs/post-fix-update';

describe('postFixUpdate integration shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminDbSessionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        fixProgress: {
          no_https: {
            status: 'pending',
            completedStepIds: [],
            planSource: 'generic',
          },
        },
      }),
    });
    adminDbAdd.mockResolvedValue({ id: 'update_123' });
    adminDbUpdate.mockResolvedValue(undefined);
  });

  it('valid post writes fixUpdates doc with correct shape', async () => {
    const result = await postFixUpdate({
      uid: 'user_1',
      sessionId: 'order_1',
      message: 'We turned on secure HTTPS for your site.',
      signalKey: 'no_https',
    });

    expect(result).toEqual({ updateId: 'update_123' });
    expect(adminDbAdd).toHaveBeenCalledWith({
      message: 'We turned on secure HTTPS for your site.',
      createdAt: FieldValue.serverTimestamp(),
      pillar: 'security',
      visibility: 'client',
      pinned: false,
    });
  });

  it('valid post bumps session updatedAt', async () => {
    await postFixUpdate({
      uid: 'user_1',
      sessionId: 'order_1',
      message: 'We turned on secure HTTPS for your site.',
    });

    expect(adminDbUpdate).toHaveBeenCalledWith({
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
});
