import { describe, expect, it, vi } from 'vitest';

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

import { verifyAuthIdToken } from '@/lib/firebase/verify-id-token';

describe('verifyAuthIdToken', () => {
  it('calls Firebase verifyIdToken with checkRevoked enabled', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_123' });

    await verifyAuthIdToken('token-abc');

    expect(mockVerifyIdToken).toHaveBeenCalledWith('token-abc', true);
  });
});
