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
  contactLastName?: string;
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
  /** Written by processDashboardInvite before signup completes. */
  sku?: string;
  entitlements?: SiteFixEntitlement[];
  inviteStatus?: string;
  invitedAt?: Timestamp;
  acceptedAt?: Timestamp | null;
  purchasedAt?: Timestamp;
  activeFixSessionId?: string | null;
  /** Incremented by access-reminder cron (max 3). */
  accessReminderCount?: number;
  /** Set when an access-reminder email is sent. */
  lastAccessReminderSentAt?: Timestamp;
}

/** Firestore siteFix during invite-first or partial signup — all namespace fields optional. */
type PartialSiteFix = Partial<SiteFixUserNamespace>;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** True when signup has already completed account setup for this order. */
export function isSiteFixAccountSetupComplete(
  siteFix: PartialSiteFix | undefined,
  uid: string
): boolean {
  if (!siteFix || siteFix.orderId === undefined) {
    return false;
  }

  if (siteFix.claimedByUserId !== uid) {
    return false;
  }

  return siteFix.accountCreatedAt != null;
}

function buildAuditLeadPrefill(
  auditLead: AuditLeadSnapshot | null,
  auditLeadLinked: boolean,
  normalizedEmail: string
): Pick<
  SiteFixUserNamespace,
  'businessName' | 'websiteUrl' | 'contactName' | 'contactEmail'
> {
  if (!auditLeadLinked || !auditLead) {
    return {
      businessName: '',
      websiteUrl: '',
      contactName: '',
      contactEmail: normalizedEmail,
    };
  }

  return {
    businessName: auditLead.businessName ?? '',
    websiteUrl: auditLead.websiteUrl ?? '',
    contactName: auditLead.firstName ?? '',
    contactEmail: auditLead.email ?? normalizedEmail,
  };
}

/** Merge audit pre-fill into siteFix without clobbering invite or user-edited fields. */
export function mergeSiteFixForAccountSetup(params: {
  existingSiteFix: PartialSiteFix | undefined;
  uid: string;
  orderId: string;
  auditLeadId: string;
  entitlements: SiteFixEntitlement[];
  auditLead: AuditLeadSnapshot | null;
  auditLeadLinked: boolean;
  normalizedEmail: string;
}): SiteFixUserNamespace & {
  accountCreatedAt: SiteFixUserNamespace['accountCreatedAt'] | ReturnType<
    typeof FieldValue.serverTimestamp
  >;
} {
  const existing = params.existingSiteFix ?? {};
  const prefill = buildAuditLeadPrefill(
    params.auditLead,
    params.auditLeadLinked,
    params.normalizedEmail
  );

  const pickNonEmpty = (existingValue: unknown, fallback: string): string => {
    if (typeof existingValue === 'string' && existingValue.trim() !== '') {
      return existingValue;
    }
    return fallback;
  };

  return {
    ...(existing as SiteFixUserNamespace),
    orderId: params.orderId,
    auditLeadId: params.auditLeadId,
    claimedByUserId: params.uid,
    purchasedPackages:
      (Array.isArray(existing.purchasedPackages)
        ? existing.purchasedPackages
        : undefined) ?? params.entitlements,
    onboardingStatus:
      (existing.onboardingStatus as OnboardingStatus | undefined) ??
      ONBOARDING_STATUS.AWAITING_ACCESS,
    businessName: pickNonEmpty(existing.businessName, prefill.businessName),
    websiteUrl: pickNonEmpty(existing.websiteUrl, prefill.websiteUrl),
    contactName: pickNonEmpty(existing.contactName, prefill.contactName),
    contactEmail: pickNonEmpty(existing.contactEmail, prefill.contactEmail),
    access_request:
      (existing.access_request as SiteFixUserNamespace['access_request']) ?? {
        submittedAt: null,
        method: null,
        notes: null,
      },
    onboardingCompletedAt:
      (existing.onboardingCompletedAt as Timestamp | null) ?? null,
    accountCreatedAt:
      (existing.accountCreatedAt as Timestamp | undefined) ??
      (FieldValue.serverTimestamp() as SiteFixUserNamespace['accountCreatedAt']),
  };
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
      | PartialSiteFix
      | undefined;

    if (
      existingSiteFix?.orderId === orderId &&
      isSiteFixAccountSetupComplete(existingSiteFix, pending.claimedByUserId)
    ) {
      return { uid: pending.claimedByUserId, orderId };
    }

    if (existingSiteFix?.orderId !== orderId) {
      throw new ClaimError(
        'ORDER_ALREADY_CLAIMED',
        'This order has already been claimed'
      );
    }
  } else if (pending.claimState !== 'unclaimed') {
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
  let authUserAlreadyExisted = false;

  try {
    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password,
    });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; message?: string };
    if (firebaseErr.code === 'auth/email-already-exists') {
      authUserAlreadyExisted = true;
      const existingUser = await adminAuth.getUserByEmail(normalizedEmail);
      uid = existingUser.uid;

      const existingUserSnap = await adminDb.collection('users').doc(uid).get();
      const existingSiteFix = existingUserSnap.data()?.siteFix as
        | PartialSiteFix
        | undefined;

      if (existingSiteFix?.orderId && existingSiteFix.orderId !== orderId) {
        throw new AuthError(
          firebaseErr.code,
          firebaseErr.message ?? 'Email already in use'
        );
      }
    } else {
      throw err;
    }
  }

  const userRef = adminDb.collection('users').doc(uid);
  const existingUserSnap = await userRef.get();
  const existingUserData = existingUserSnap.data() ?? {};
  const existingSiteFix = existingUserData.siteFix as PartialSiteFix | undefined;

  const setupComplete = isSiteFixAccountSetupComplete(existingSiteFix, uid);

  if (
    setupComplete &&
    pending.claimState === 'claimed' &&
    pending.claimedByUserId === uid
  ) {
    return { uid, orderId };
  }

  if (setupComplete && pending.claimState === 'unclaimed') {
    const batch = adminDb.batch();
    batch.update(pendingRef, {
      claimState: 'claimed',
      claimedByUserId: uid,
      claimedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { uid, orderId };
  }

  if (authUserAlreadyExisted) {
    await adminAuth.updateUser(uid, { password });
  }

  const siteFix = mergeSiteFixForAccountSetup({
    existingSiteFix,
    uid,
    orderId,
    auditLeadId: pending.auditLeadId,
    entitlements: pending.entitlements,
    auditLead,
    auditLeadLinked,
    normalizedEmail,
  });

  const batch = adminDb.batch();
  const userPayload: Record<string, unknown> = { siteFix };

  if (existingUserData.auditLeadLinked === undefined) {
    userPayload.auditLeadLinked = auditLeadLinked;
  }

  batch.set(userRef, userPayload, { merge: true });

  if (pending.claimState === 'unclaimed') {
    batch.update(pendingRef, {
      claimState: 'claimed',
      claimedByUserId: uid,
      claimedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { uid, orderId };
}
