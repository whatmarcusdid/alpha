import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRevokeUserSessions, mockVerifySessionCookie } = vi.hoisted(() => ({
  mockRevokeUserSessions: vi.fn(),
  mockVerifySessionCookie: vi.fn(),
}));

vi.mock('@/lib/firebase/revoke-user-sessions', () => ({
  revokeUserSessions: (...args: unknown[]) => mockRevokeUserSessions(...args),
}));

vi.mock('@/lib/firebase/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/firebase/session')>();
  return {
    ...actual,
    verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
    createSessionCookie: vi.fn(async () => 'session-cookie-value'),
  };
});

import { DELETE } from '@/app/api/auth/session/route';

describe('DELETE /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user_logout_123',
      email: 'user@example.com',
      displayName: null,
      isAdmin: false,
      decoded: {},
    });
    mockRevokeUserSessions.mockResolvedValue(undefined);
  });

  it('revokes refresh tokens for the current session user on logout', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'DELETE',
        headers: {
          cookie: '__session=valid-session-cookie',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mockVerifySessionCookie).toHaveBeenCalledWith('valid-session-cookie');
    expect(mockRevokeUserSessions).toHaveBeenCalledWith('user_logout_123');

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('__session=');
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });

  it('clears the session cookie even when no session cookie is present', async () => {
    const response = await DELETE(
      new NextRequest('http://localhost:3000/api/auth/session', { method: 'DELETE' })
    );

    expect(response.status).toBe(200);
    expect(mockRevokeUserSessions).not.toHaveBeenCalled();
  });
});
