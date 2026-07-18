import type { DecodedIdToken } from 'firebase-admin/auth';

import { adminAuth } from '@/lib/firebase/admin';

/**
 * Verify a Firebase ID token with revocation checking enabled.
 * Adds one Auth backend lookup per call — required for logout/reset safety.
 */
export async function verifyAuthIdToken(idToken: string): Promise<DecodedIdToken> {
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth is not initialized');
  }

  return adminAuth.verifyIdToken(idToken, true);
}
