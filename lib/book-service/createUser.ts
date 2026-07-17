/**
 * Site Fix account creation — separate from subscription user creation.
 * Writes users/{uid}.siteFix and atomically claims pending_orders/{orderId}.
 */

import { FieldValue, type Timestamp } from 'firebase-admin/firestore';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

import type { OnboardingStatus } from './onboarding-constants';
import { ONBOARDING_STATUS } from './onboarding-constants';
import type { SiteFixEntitlement } from './skus';
import type { SiteFixPendingOrder } from './types';

export type ClaimErrorCode = 'ORDER_ALREADY_CLAIMED' | 'ORDER_NOT_FOUND';

export class ClaimError extends Error {
  readonly code: ClaimErrorCode;

  constructor(code: ClaimErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ClaimError';
    this.code = code;
  }
}

export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

interface AuditLeadSnapshot {
  firstName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
}

export interface SiteFixUserNamespace {
  orderId: string;
  auditLeadId: string;
  claimedByUserId: string;
  purchasedPackages: SiteFixEntitlement[];
  onboardingStatus: OnboardingStatus;
  businessName: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  access_request: {
    submittedAt: Timestamp | null;
    method: string | null;
    notes: string | null;
    loginUrl?: string | null;
    username?: string | null;
    passwordEncrypted?: string | null;
    hostingProvider?: string | null;
    status?: 'partial' | 'submitted';
  };
  onboardingCompletedAt: Timestamp | null;
  accountCreatedAt: Timestamp;
  siteConfirmedAt?: Timestamp;
  websiteUrlCorrected?: boolean;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function createUserWithSiteFixOrder(params: {
  email: string;
  password: string;
  orderId: string;
}): Promise<{ uid: string; orderId: string }> {
  if (!adminDb || !adminAuth) {
    throw new Error('Firebase Admin not initialized');
  }

  const normalizedEmail = normalizeEmail(params.email);
  const { orderId, password } = params;

  const pendingRef = adminDb.collection('pending_orders').doc(orderId);
  const pendingSnap = await pendingRef.get();

  if (!pendingSnap.exists) {
    throw new ClaimError('ORDER_NOT_FOUND', 'Order not found');
  }

  const pending = pendingSnap.data() as SiteFixPendingOrder;

  if (pending.claimState === 'claimed' && pending.claimedByUserId) {
    const claimedUserRef = adminDb.collection('users').doc(pending.claimedByUserId);
    const claimedUserSnap = await claimedUserRef.get();
    const existingSiteFix = claimedUserSnap.data()?.siteFix as
      | SiteFixUserNamespace
      | undefined;

    if (existingSiteFix?.orderId === orderId) {
      return { uid: pending.claimedByUserId, orderId };
    }

    throw new ClaimError(
      'ORDER_ALREADY_CLAIMED',
      'This order has already been claimed'
    );
  }

  if (pending.claimState !== 'unclaimed') {
    throw new ClaimError(
      'ORDER_ALREADY_CLAIMED',
      'This order has already been claimed'
    );
  }

  const auditLeadSnap = await adminDb
    .collection('auditLeads')
    .doc(pending.auditLeadId)
    .get();

  const auditLeadLinked = auditLeadSnap.exists;
  const auditLead = auditLeadLinked
    ? (auditLeadSnap.data() as AuditLeadSnapshot)
    : null;

  let uid: string;

  try {
    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password,
    });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; message?: string };
    if (firebaseErr.code === 'auth/email-already-exists') {
      const existingUser = await adminAuth.getUserByEmail(normalizedEmail);
      uid = existingUser.uid;

      const existingUserSnap = await adminDb.collection('users').doc(uid).get();
      const existingSiteFix = existingUserSnap.data()?.siteFix as
        | SiteFixUserNamespace
        | undefined;

      if (existingSiteFix?.orderId === orderId) {
        return { uid, orderId };
      }

      throw new AuthError(
        firebaseErr.code,
        firebaseErr.message ?? 'Email already in use'
      );
    }

    throw err;
  }

  const userRef = adminDb.collection('users').doc(uid);
  const existingUserSnap = await userRef.get();
  const existingSiteFix = existingUserSnap.data()?.siteFix as
    | SiteFixUserNamespace
    | undefined;

  if (existingSiteFix?.orderId === orderId) {
    return { uid, orderId };
  }

  const siteFix: Omit<
    SiteFixUserNamespace,
    'accountCreatedAt' | 'onboardingCompletedAt'
  > & {
    accountCreatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
    onboardingCompletedAt: null;
  } = {
    orderId,
    auditLeadId: pending.auditLeadId,
    claimedByUserId: uid,
    purchasedPackages: pending.entitlements,
    onboardingStatus: ONBOARDING_STATUS.AWAITING_ACCESS,
    businessName: auditLead?.businessName ?? '',
    websiteUrl: auditLead?.websiteUrl ?? '',
    contactName: auditLead?.firstName ?? '',
    contactEmail: auditLead?.email ?? normalizedEmail,
    access_request: {
      submittedAt: null,
      method: null,
      notes: null,
    },
    onboardingCompletedAt: null,
    accountCreatedAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(userRef, { siteFix, auditLeadLinked }, { merge: true });
  batch.update(pendingRef, {
    claimState: 'claimed',
    claimedByUserId: uid,
    claimedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { uid, orderId };
}
