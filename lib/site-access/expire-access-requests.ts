import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';

import { SITE_ACCESS_REQUESTS_COLLECTION } from '@/lib/site-access/create-site-access-request';

export async function expireGrantedAccessRequests(): Promise<{ expired: number }> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const now = Timestamp.now();
  const querySnap = await adminDb
    .collection(SITE_ACCESS_REQUESTS_COLLECTION)
    .where('status', '==', 'granted')
    .where('expiresAt', '<=', now)
    .get();

  if (querySnap.empty) {
    return { expired: 0 };
  }

  const batch = adminDb.batch();

  for (const docSnap of querySnap.docs) {
    batch.update(docSnap.ref, { status: 'expired' });
  }

  await batch.commit();

  return { expired: querySnap.size };
}
