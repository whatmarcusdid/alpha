import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionGet, userUpdate, sessionUpdate } = vi.hoisted(() => ({
  sessionGet: vi.fn(),
  userUpdate: vi.fn(),
  sessionUpdate: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: vi.fn(() => ({
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: sessionGet,
                update: sessionUpdate,
              })),
            })),
            update: userUpdate,
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  },
}));

import { confirmHostingContext } from '@/lib/fix-jobs/confirm-hosting-context';

describe('confirmHostingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionGet.mockResolvedValue({ exists: true });
    userUpdate.mockResolvedValue(undefined);
    sessionUpdate.mockResolvedValue(undefined);
  });

  it('valid PATCH: hostingContext written to users/{uid} with confirmedAt and confirmedBy', async () => {
    const result = await confirmHostingContext({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      host: 'kinsta',
      cms: 'wordpress',
      cmsVersion: '6.4.2',
      plugins: ['WP Rocket', 'Yoast'],
    });

    expect(result.success).toBe(true);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'hostingContext.host': 'kinsta',
        'hostingContext.cms': 'wordpress',
        'hostingContext.cmsVersion': '6.4.2',
        'hostingContext.plugins': ['WP Rocket', 'Yoast'],
        'hostingContext.confirmedBy': 'admin_1',
      })
    );
    expect(userUpdate.mock.calls[0]?.[0]['hostingContext.confirmedAt']).toEqual(
      expect.any(String)
    );
  });

  it('valid PATCH: session updatedAt bumped', async () => {
    await confirmHostingContext({
      uid: 'user_1',
      sessionId: 'session_1',
      adminUid: 'admin_1',
      host: 'kinsta',
      cms: 'wordpress',
      plugins: [],
    });

    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: expect.anything(),
      })
    );
  });

  it('missing session → 404', async () => {
    sessionGet.mockResolvedValueOnce({ exists: false });

    const result = await confirmHostingContext({
      uid: 'user_1',
      sessionId: 'missing',
      adminUid: 'admin_1',
      host: 'kinsta',
      cms: 'wordpress',
      plugins: [],
    });

    expect(result).toEqual({
      success: false,
      status: 404,
      error: 'Fix job not found',
    });
  });
});
