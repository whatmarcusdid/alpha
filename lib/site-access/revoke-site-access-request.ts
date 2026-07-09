import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import type { SiteAccessRequestDoc } from '@/lib/types/site-access-request';

import { SITE_ACCESS_REQUESTS_COLLECTION } from '@/lib/site-access/create-site-access-request';

export type RevokeSiteAccessRequestResult =
  | { success: true }
  | { success: false; status: 403 | 404 | 409 | 500; error: string };

export async function revokeSiteAccessRequest(params: {
  requestId: string;
  uid: string;
}): Promise<RevokeSiteAccessRequestResult> {
  if (!adminDb) {
    return { success: false, status: 500, error: 'Server configuration error' };
  }

  const docRef = adminDb.collection(SITE_ACCESS_REQUESTS_COLLECTION).doc(params.requestId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return { success: false, status: 404, error: 'Access request not found' };
  }

  const doc = docSnap.data() as SiteAccessRequestDoc;

  if (doc.clientUid !== params.uid) {
    return { success: false, status: 403, error: 'Forbidden' };
  }

  if (doc.status === 'revoked') {
    return { success: false, status: 409, error: 'Already revoked' };
  }

  await docRef.update({
    status: 'revoked',
    revokedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}
