import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import { sendAccessGrantedNotificationEmail } from '@/lib/site-access/emails';
import {
  findPendingAccessRequestByToken,
  formatExpiresAtForEmail,
  type TokenValidationError,
} from '@/lib/site-access/token-validation';
import {
  resolveBusinessName,
  resolveCustomerName,
} from '@/lib/site-access/user-fields';

export type GrantSiteAccessResult =
  | { success: true; expiresAt: string }
  | TokenValidationError
  | { success: false; status: 500; error: string };

export async function grantSiteAccess(rawToken: string): Promise<GrantSiteAccessResult> {
  const validation = await findPendingAccessRequestByToken(rawToken);
  if (!validation.success) {
    return validation;
  }

  if (!adminDb) {
    return { success: false, status: 500, error: 'Server configuration error' };
  }

  const { doc, ref } = validation;
  const grantedAt = Timestamp.now();
  const expiresAtDate = new Date(grantedAt.toDate());
  expiresAtDate.setDate(expiresAtDate.getDate() + doc.expiryDays);
  const expiresAt = Timestamp.fromDate(expiresAtDate);

  await adminDb.runTransaction(async (transaction) => {
    const currentSnap = await transaction.get(ref);
    if (!currentSnap.exists) {
      throw new Error('REQUEST_NOT_FOUND');
    }

    const current = currentSnap.data() as typeof doc;
    if (current.tokenUsed || current.status !== 'pending') {
      throw new Error('TOKEN_ALREADY_USED');
    }

    transaction.update(ref, {
      status: 'granted',
      grantedAt,
      expiresAt,
      tokenUsed: true,
    });
  });

  const userSnap = await adminDb.collection('users').doc(doc.clientUid).get();
  const userData = userSnap.exists
    ? (userSnap.data() as Record<string, unknown>)
    : {};

  void sendAccessGrantedNotificationEmail({
    adminEmail: doc.requestedByEmail,
    customerName: resolveCustomerName(userData),
    businessName: resolveBusinessName(userData),
    sessionId: doc.sessionId,
    accessType: doc.accessType,
    expiresAt: formatExpiresAtForEmail(expiresAtDate),
  }).catch((error) => {
    console.error('[site-access] Failed to send access granted admin email:', error);
  });

  return { success: true, expiresAt: expiresAtDate.toISOString() };
}
