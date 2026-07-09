import 'server-only';

import type { DocumentReference } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import { hashAccessToken } from '@/lib/site-access/token';
import type { SiteAccessRequestDoc } from '@/lib/types/site-access-request';

import { SITE_ACCESS_REQUESTS_COLLECTION } from '@/lib/site-access/create-site-access-request';

export const ACCESS_LINK_MAX_DAYS = 7;

export type TokenValidationError = {
  success: false;
  status: 400;
  error: string;
};

export type ValidPendingAccessRequest = {
  success: true;
  requestId: string;
  doc: SiteAccessRequestDoc;
  ref: DocumentReference;
};

function timestampToDate(value: Timestamp | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  return null;
}

export function isAccessLinkExpired(requestedAt: Timestamp | null | undefined): boolean {
  const requestedDate = timestampToDate(requestedAt ?? null);
  if (!requestedDate) {
    return true;
  }

  const maxExpiry = new Date(requestedDate);
  maxExpiry.setDate(maxExpiry.getDate() + ACCESS_LINK_MAX_DAYS);
  return new Date() > maxExpiry;
}

export async function findPendingAccessRequestByToken(
  rawToken: string
): Promise<ValidPendingAccessRequest | TokenValidationError> {
  if (!adminDb) {
    return { success: false, status: 400, error: 'Invalid or expired access link' };
  }

  const tokenHash = hashAccessToken(rawToken);

  const querySnap = await adminDb
    .collection(SITE_ACCESS_REQUESTS_COLLECTION)
    .where('tokenHash', '==', tokenHash)
    .where('tokenUsed', '==', false)
    .limit(1)
    .get();

  if (querySnap.empty) {
    return { success: false, status: 400, error: 'Invalid or expired access link' };
  }

  const docSnap = querySnap.docs[0];
  const doc = docSnap.data() as SiteAccessRequestDoc;

  if (doc.status !== 'pending') {
    return { success: false, status: 400, error: 'This access link has already been used' };
  }

  if (isAccessLinkExpired(doc.requestedAt)) {
    return { success: false, status: 400, error: 'This access link has expired' };
  }

  return {
    success: true,
    requestId: docSnap.id,
    doc,
    ref: docSnap.ref,
  };
}

export function formatExpiresAtForEmail(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
