import { adminAuth } from '@/lib/firebase/admin';

/**
 * Invalidates all refresh tokens for a user. Firebase also invalidates existing
 * ID tokens and session cookies when verified with checkRevoked: true.
 */
export async function revokeUserSessions(uid: string): Promise<void> {
  if (!adminAuth) {
    console.error('[auth] revokeUserSessions failed — Firebase Admin Auth unavailable');
    return;
  }

  await adminAuth.revokeRefreshTokens(uid);
}
