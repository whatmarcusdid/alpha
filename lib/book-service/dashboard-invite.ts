import { FieldValue } from 'firebase-admin/firestore';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

import { sendDashboardInviteEmail } from './emails';
import { expandEntitlements, type SiteFixSKU } from './skus';
import { warnIfBaseUrlLooksWrong } from './validate-base-url';
import { getAppBaseUrl as resolveAppBaseUrl } from '@/lib/base-url';

export type DashboardInviteParams = {
  userId: string;
  email: string;
  orderId: string;
  sku: SiteFixSKU;
};

function getAppBaseUrl(): string {
  warnIfBaseUrlLooksWrong();
  return resolveAppBaseUrl();
}

export async function resolveOrCreateUserIdForInvite(email: string): Promise<string | null> {
  if (!adminAuth) {
    console.error('[dashboard-invite] Firebase Admin Auth not initialized');
    return null;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existingUser = await adminAuth.getUserByEmail(normalizedEmail);
    return existingUser.uid;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code !== 'auth/user-not-found') {
      console.error('[dashboard-invite] Failed to look up user by email:', error);
      return null;
    }
  }

  try {
    const createdUser = await adminAuth.createUser({ email: normalizedEmail });
    return createdUser.uid;
  } catch (error) {
    console.error('[dashboard-invite] Failed to create invite user:', error);
    return null;
  }
}

export async function processDashboardInvite(
  params: DashboardInviteParams
): Promise<{ success: true }> {
  if (!adminDb) {
    console.error('[dashboard-invite] Firebase Admin not initialized');
    return { success: true };
  }

  const { userId, email, orderId, sku } = params;
  const normalizedEmail = email.toLowerCase().trim();
  const entitlements = expandEntitlements(sku);
  const dashboardUrl = `${getAppBaseUrl()}/dashboard`;

  try {
    await adminDb.collection('users').doc(userId).set(
      {
        email: normalizedEmail,
        siteFix: {
          sku,
          entitlements,
          orderId,
          inviteStatus: 'sent',
          invitedAt: FieldValue.serverTimestamp(),
          acceptedAt: null,
          purchasedAt: FieldValue.serverTimestamp(),
          activeFixSessionId: null,
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[dashboard-invite] Failed to write invite status:', error);
    return { success: true };
  }

  try {
    await sendDashboardInviteEmail({
      email: normalizedEmail,
      orderId,
      dashboardUrl,
    });
  } catch (error) {
    console.error('[dashboard-invite] Loops invite email failed (non-blocking):', error);
  }

  return { success: true };
}
