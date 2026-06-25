/**
 * Site Fix onboarding status — server-side reads and transitions.
 */

import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';

import {
  ONBOARDING_STATUS,
  type OnboardingStatus,
} from './onboarding-constants';

export { ONBOARDING_STATUS, type OnboardingStatus };

/**
 * Transition awaiting_access → delivery_ready.
 * Called when access_request.submittedAt is written (full access submit).
 */
export async function transitionToDeliveryReady(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const userRef = adminDb.collection('users').doc(userId);
  await userRef.update({
    'siteFix.onboardingStatus': ONBOARDING_STATUS.DELIVERY_READY,
    'siteFix.onboardingCompletedAt': FieldValue.serverTimestamp(),
  });
}

export async function getOnboardingStatus(
  userId: string
): Promise<OnboardingStatus | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const userSnap = await adminDb.collection('users').doc(userId).get();
  const status = userSnap.data()?.siteFix?.onboardingStatus;

  if (
    status === ONBOARDING_STATUS.AWAITING_ACCESS ||
    status === ONBOARDING_STATUS.DELIVERY_READY
  ) {
    return status;
  }

  return null;
}
