import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import { SITE_ACCESS_REQUESTS_COLLECTION } from '@/lib/site-access/create-site-access-request';
import type {
  SiteAccessRequestDoc,
  SiteAccessRequestPayload,
} from '@/lib/types/site-access-request';

function timestampToIso(value: Timestamp | null | undefined): string | null {
  if (!value || typeof value.toDate !== 'function') {
    return null;
  }

  return value.toDate().toISOString();
}

export function serializeSiteAccessRequest(
  doc: SiteAccessRequestDoc
): SiteAccessRequestPayload {
  return {
    requestId: doc.requestId,
    clientUid: doc.clientUid,
    sessionId: doc.sessionId,
    requestedAt: timestampToIso(doc.requestedAt) ?? new Date(0).toISOString(),
    accessType: doc.accessType,
    scopeDescription: doc.scopeDescription,
    expiryDays: doc.expiryDays,
    expiresAt: timestampToIso(doc.expiresAt),
    status: doc.status,
    grantedAt: timestampToIso(doc.grantedAt),
    revokedAt: timestampToIso(doc.revokedAt),
  };
}

export async function loadLatestSiteAccessRequest(
  uid: string,
  sessionId: string
): Promise<SiteAccessRequestPayload | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const querySnap = await adminDb
    .collection(SITE_ACCESS_REQUESTS_COLLECTION)
    .where('clientUid', '==', uid)
    .where('sessionId', '==', sessionId)
    .orderBy('requestedAt', 'desc')
    .limit(1)
    .get();

  if (querySnap.empty) {
    return null;
  }

  const doc = querySnap.docs[0].data() as SiteAccessRequestDoc;
  return serializeSiteAccessRequest(doc);
}
