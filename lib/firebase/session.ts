import type { DecodedIdToken } from 'firebase-admin/auth';

import { adminAuth } from '@/lib/firebase/admin';

export const SESSION_COOKIE_NAME = '__session';

/** Firebase session cookie lifetime — 5 days. */
export const SESSION_COOKIE_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export type VerifiedSession = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  decoded: DecodedIdToken;
};

export async function createSessionCookie(idToken: string): Promise<string> {
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth is not initialized');
  }

  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export async function verifySessionCookie(
  sessionCookie: string
): Promise<VerifiedSession | null> {
  if (!adminAuth) {
    console.error('[session] Firebase Admin Auth is not initialized');
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : null,
      displayName: typeof decoded.name === 'string' ? decoded.name : null,
      isAdmin: decoded.admin === true,
      decoded,
    };
  } catch (error) {
    console.error('[session] verifySessionCookie failed:', error);
    return null;
  }
}

export async function verifyAdminSession(
  sessionCookie: string | undefined
): Promise<VerifiedSession | null> {
  if (!sessionCookie) {
    return null;
  }

  const session = await verifySessionCookie(sessionCookie);
  if (!session?.isAdmin) {
    return null;
  }

  return session;
}
