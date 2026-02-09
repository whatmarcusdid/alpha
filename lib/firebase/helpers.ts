/**
 * Firebase Admin Helper Functions
 * 
 * Provides runtime safety checks for Firebase Admin access in API routes.
 * These helpers ensure Firebase Admin is properly initialized before use
 * and throw helpful errors when it's not available.
 * 
 * Usage in API routes:
 * ```typescript
 * import { getAdminDb, getAdminAuth } from '@/lib/firebase/helpers';
 * 
 * export async function GET() {
 *   const db = getAdminDb(); // Throws if not available
 *   const users = await db.collection('users').get();
 *   return Response.json({ users });
 * }
 * ```
 */

import { adminDb, adminAuth } from './admin';

/**
 * Check if Firebase Admin is available and initialized
 * 
 * @returns true if both adminDb and adminAuth are initialized, false otherwise
 */
export function isFirebaseAdminAvailable(): boolean {
  return adminDb !== null && adminAuth !== null;
}

/**
 * Get Firebase Admin Firestore instance with runtime safety check
 * 
 * @returns Firebase Admin Firestore instance
 * @throws Error if Firebase Admin is not initialized
 */
export function getAdminDb() {
  if (!adminDb) {
    throw new Error(
      'Firebase Admin Firestore is not initialized. ' +
      'This usually means:\n' +
      '1. Missing environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)\n' +
      '2. Firebase Admin initialization failed during startup\n' +
      '3. You are calling this during build-time (check NEXT_PHASE)\n\n' +
      'Verify your .env.local file contains all required Firebase Admin variables and restart the server.'
    );
  }
  return adminDb;
}

/**
 * Get Firebase Admin Auth instance with runtime safety check
 * 
 * @returns Firebase Admin Auth instance
 * @throws Error if Firebase Admin is not initialized
 */
export function getAdminAuth() {
  if (!adminAuth) {
    throw new Error(
      'Firebase Admin Auth is not initialized. ' +
      'This usually means:\n' +
      '1. Missing environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)\n' +
      '2. Firebase Admin initialization failed during startup\n' +
      '3. You are calling this during build-time (check NEXT_PHASE)\n\n' +
      'Verify your .env.local file contains all required Firebase Admin variables and restart the server.'
    );
  }
  return adminAuth;
}

/**
 * Get both Firebase Admin instances with runtime safety check
 * 
 * @returns Object containing both adminDb and adminAuth instances
 * @throws Error if Firebase Admin is not initialized
 */
export function getFirebaseAdmin() {
  return {
    db: getAdminDb(),
    auth: getAdminAuth(),
  };
}
