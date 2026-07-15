import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { getAppBaseUrl } from '@/lib/base-url';
import { sendAccessReRequestEmail } from '@/lib/site-access/emails';
import { generateAccessToken, hashAccessToken } from '@/lib/site-access/token';
import {
  resolveBusinessName,
  resolveCustomerEmail,
  resolveCustomerName,
} from '@/lib/site-access/user-fields';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { AccessType } from '@/lib/types/site-access-request';

export const SITE_ACCESS_REQUESTS_COLLECTION = 'siteAccessRequests';

export type CreateSiteAccessRequestInput = {
  uid: string;
  sessionId: string;
  adminUid: string;
  accessType: AccessType;
  scopeDescription: string;
  expiryDays: 1 | 3 | 7 | 14;
};

export type CreateSiteAccessRequestResult =
  | { success: true; requestId: string }
  | { success: false; status: 404 | 409 | 500; error: string };

export async function createSiteAccessRequest(
  input: CreateSiteAccessRequestInput
): Promise<CreateSiteAccessRequestResult> {
  if (!adminDb) {
    return { success: false, status: 500, error: 'Server configuration error' };
  }

  const sessionSnap = await adminDb
    .collection('users')
    .doc(input.uid)
    .collection('fixSessions')
    .doc(input.sessionId)
    .get();

  if (!sessionSnap.exists) {
    return { success: false, status: 404, error: 'Fix job not found' };
  }

  const userSnap = await adminDb.collection('users').doc(input.uid).get();
  if (!userSnap.exists) {
    return { success: false, status: 404, error: 'User not found' };
  }

  const pendingSnap = await adminDb
    .collection(SITE_ACCESS_REQUESTS_COLLECTION)
    .where('clientUid', '==', input.uid)
    .where('sessionId', '==', input.sessionId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!pendingSnap.empty) {
    return {
      success: false,
      status: 409,
      error: 'A pending access request already exists for this job',
    };
  }

  let requestedByEmail = '';
  if (adminAuth) {
    try {
      const adminUser = await adminAuth.getUser(input.adminUid);
      requestedByEmail = adminUser.email ?? '';
    } catch (error) {
      console.error('[site-access] Failed to load admin email:', error);
    }
  }

  const userData = userSnap.data() as Record<string, unknown>;
  const customerEmail = resolveCustomerEmail(userData);

  if (!customerEmail) {
    return { success: false, status: 404, error: 'User not found' };
  }

  const rawToken = generateAccessToken();
  const tokenHash = hashAccessToken(rawToken);

  const docRef = adminDb.collection(SITE_ACCESS_REQUESTS_COLLECTION).doc();
  const requestId = docRef.id;

  await docRef.set({
    requestId,
    clientUid: input.uid,
    sessionId: input.sessionId,
    requestedAt: FieldValue.serverTimestamp(),
    requestedBy: input.adminUid,
    requestedByEmail,
    accessType: input.accessType,
    scopeDescription: input.scopeDescription,
    expiryDays: input.expiryDays,
    expiresAt: null,
    status: 'pending',
    grantedAt: null,
    revokedAt: null,
    tokenHash,
    tokenUsed: false,
  });

  const baseUrl = getAppBaseUrl();
  const grantUrl = `${baseUrl}/book-service/access-request/grant?token=${encodeURIComponent(rawToken)}`;
  const declineUrl = `${baseUrl}/book-service/access-request/decline?token=${encodeURIComponent(rawToken)}`;

  void sendAccessReRequestEmail({
    recipientEmail: customerEmail,
    customerName: resolveCustomerName(userData),
    businessName: resolveBusinessName(userData),
    scopeDescription: input.scopeDescription,
    accessType: input.accessType,
    grantUrl,
    declineUrl,
    expiryDays: input.expiryDays,
  }).catch((error) => {
    console.error('[site-access] Failed to send re-request email:', error);
  });

  return { success: true, requestId };
}

export function buildSiteAccessRequestDocForTests(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    requestId: 'req_1',
    clientUid: 'user_1',
    sessionId: 'session_1',
    requestedAt: Timestamp.fromDate(new Date('2026-07-01T12:00:00.000Z')),
    requestedBy: 'admin_1',
    requestedByEmail: 'admin@example.com',
    accessType: 'wp_admin',
    scopeDescription: 'We need updated WordPress admin access because the submitted credentials expired.',
    expiryDays: 7,
    expiresAt: null,
    status: 'pending',
    grantedAt: null,
    revokedAt: null,
    tokenHash: hashAccessToken('abc123'),
    tokenUsed: false,
    ...overrides,
  };
}
