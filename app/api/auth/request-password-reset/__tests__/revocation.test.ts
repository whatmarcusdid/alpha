import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSet, mockGetUsers, mockRevokeUserSessions } = vi.hoisted(() => ({
  mockSet: vi.fn().mockResolvedValue(undefined),
  mockGetUsers: vi.fn(),
  mockRevokeUserSessions: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    getUsers: (...args: unknown[]) => mockGetUsers(...args),
  },
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({ set: mockSet }),
    }),
  },
}));

vi.mock('@/lib/firebase/revoke-user-sessions', () => ({
  revokeUserSessions: (...args: unknown[]) => mockRevokeUserSessions(...args),
}));

vi.mock('@/lib/loops', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn() },
}));

import { POST } from '@/app/api/auth/request-password-reset/route';

describe('POST /api/auth/request-password-reset session revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUsers.mockResolvedValue({
      users: [{ uid: 'user_revoke_me', displayName: 'Test User' }],
    });
    mockRevokeUserSessions.mockResolvedValue(undefined);
    process.env.PASSWORD_RESET_EMAIL_MODE = 'console';
    delete process.env.LOOPS_API_KEY;
  });

  it('revokes existing sessions when a reset is requested for a known user', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify({ email: 'known@example.com' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockRevokeUserSessions).toHaveBeenCalledWith('user_revoke_me');
  });
});
