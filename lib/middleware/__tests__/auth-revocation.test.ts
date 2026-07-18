import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

vi.mock('@/lib/firebase/verify-id-token', () => ({
  verifyAuthIdToken: (token: string) => mockVerifyIdToken(token, true),
}));

import { verifyAuthToken } from '@/lib/middleware/auth';

describe('verifyAuthToken revocation handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces revoked tokens as a 401 auth error', async () => {
    mockVerifyIdToken.mockRejectedValue({
      code: 'auth/id-token-revoked',
      message: 'The Firebase ID token has been revoked.',
    });

    const result = await verifyAuthToken(
      new NextRequest('http://localhost:3000/api/example', {
        headers: { Authorization: 'Bearer revoked-token' },
      })
    );

    expect(result.userId).toBeNull();
    expect(result.error).toMatch(/revoked/i);
    expect(mockVerifyIdToken).toHaveBeenCalledWith('revoked-token', true);
  });
});
