import 'server-only';

import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';

import { sendSiteFixAccessReminderEmail } from '@/lib/book-service/emails';
import { ONBOARDING_STATUS } from '@/lib/book-service/onboarding-constants';
import type { SiteFixUserNamespace } from '@/lib/book-service/createUser';
import type { SiteFixOrder } from '@/lib/book-service/types';
import { resolveSessionStage } from '@/lib/fix-jobs/helpers';
import type { FixJobStage, FixSessionDoc } from '@/lib/types/fix-session';
import { getAppBaseUrl } from '@/lib/base-url';
import { adminDb } from '@/lib/firebase/admin';

export const MAX_ACCESS_REMINDERS = 3;
export const ACCESS_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type AccessReminderEvaluationInput = {
  nowMs: number;
  orderCreatedAtMs: number | null;
  lastAccessReminderSentAtMs: number | null;
  accessReminderCount: number;
  onboardingStatus: string | null | undefined;
  accessRequestStatus: 'partial' | 'submitted' | null | undefined;
  accessSubmittedAt: boolean;
  sessionStage: FixJobStage;
  orderStatus: SiteFixOrder['status'] | null | undefined;
};

export type AccessReminderSkipReason =
  | 'not_awaiting_access'
  | 'access_submitted'
  | 'order_inactive'
  | 'max_reminders_reached'
  | 'too_soon'
  | 'missing_order_created_at'
  | 'missing_contact_email';

export type AccessReminderEvaluationResult =
  | { eligible: true }
  | { eligible: false; reason: AccessReminderSkipReason };

export function evaluateAccessReminderEligibility(
  input: AccessReminderEvaluationInput
): AccessReminderEvaluationResult {
  if (input.sessionStage !== 'awaiting_access') {
    return { eligible: false, reason: 'not_awaiting_access' };
  }

  if (input.onboardingStatus !== ONBOARDING_STATUS.AWAITING_ACCESS) {
    return { eligible: false, reason: 'not_awaiting_access' };
  }

  if (
    input.accessRequestStatus === 'submitted' ||
    input.accessSubmittedAt
  ) {
    return { eligible: false, reason: 'access_submitted' };
  }

  if (input.orderStatus != null && input.orderStatus !== 'paid') {
    return { eligible: false, reason: 'order_inactive' };
  }

  if (input.accessReminderCount >= MAX_ACCESS_REMINDERS) {
    return { eligible: false, reason: 'max_reminders_reached' };
  }

  if (input.orderCreatedAtMs == null) {
    return { eligible: false, reason: 'missing_order_created_at' };
  }

  const anchorMs = Math.max(
    input.orderCreatedAtMs,
    input.lastAccessReminderSentAtMs ?? 0
  );

  if (input.nowMs - anchorMs < ACCESS_REMINDER_INTERVAL_MS) {
    return { eligible: false, reason: 'too_soon' };
  }

  return { eligible: true };
}

function timestampToMs(value: Timestamp | undefined | null): number | null {
  if (!value || typeof value.toDate !== 'function') {
    return null;
  }

  return value.toDate().getTime();
}

function resolveFirstName(siteFix: Partial<SiteFixUserNamespace>): string {
  const contactName =
    typeof siteFix.contactName === 'string' ? siteFix.contactName.trim() : '';
  const first = contactName.split(/\s+/)[0];
  return first || 'there';
}

function buildAccessUrl(orderId: string): string {
  return `${getAppBaseUrl()}/book-service/access?orderId=${encodeURIComponent(orderId)}`;
}

type ReminderSendPayload = {
  email: string;
  firstName: string;
  orderId: string;
  accessUrl: string;
};

async function trySendReminderForSession(params: {
  db: Firestore;
  uid: string;
  orderId: string;
  now: Date;
}): Promise<'sent' | 'skipped'> {
  const { db, uid, orderId, now } = params;
  const userRef = db.collection('users').doc(uid);
  const orderRef = db.collection('orders').doc(orderId);
  const sessionRef = userRef.collection('fixSessions').doc(orderId);

  const payload = await db.runTransaction(async (transaction) => {
    const [userSnap, orderSnap, sessionSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(orderRef),
      transaction.get(sessionRef),
    ]);

    if (!userSnap.exists) {
      return null;
    }

    const userData = userSnap.data() as Record<string, unknown>;
    const siteFix =
      userData.siteFix && typeof userData.siteFix === 'object'
        ? (userData.siteFix as Partial<SiteFixUserNamespace>)
        : undefined;

    if (!siteFix) {
      return null;
    }

    const order = orderSnap.exists
      ? (orderSnap.data() as SiteFixOrder)
      : null;
    const sessionData = sessionSnap.exists
      ? (sessionSnap.data() as FixSessionDoc)
      : undefined;

    const evaluation = evaluateAccessReminderEligibility({
      nowMs: now.getTime(),
      orderCreatedAtMs: timestampToMs(order?.createdAt),
      lastAccessReminderSentAtMs: timestampToMs(siteFix.lastAccessReminderSentAt),
      accessReminderCount: siteFix.accessReminderCount ?? 0,
      onboardingStatus: siteFix.onboardingStatus,
      accessRequestStatus: siteFix.access_request?.status,
      accessSubmittedAt: siteFix.access_request?.submittedAt != null,
      sessionStage: resolveSessionStage(sessionData ?? {}),
      orderStatus: order?.status ?? null,
    });

    if (!evaluation.eligible) {
      return null;
    }

    const email =
      (typeof siteFix.contactEmail === 'string' && siteFix.contactEmail.trim()) ||
      (typeof userData.email === 'string' && userData.email.trim()) ||
      '';

    if (!email) {
      return null;
    }

    transaction.update(userRef, {
      'siteFix.accessReminderCount': FieldValue.increment(1),
      'siteFix.lastAccessReminderSentAt': FieldValue.serverTimestamp(),
    });

    return {
      email,
      firstName: resolveFirstName(siteFix),
      orderId,
      accessUrl: buildAccessUrl(orderId),
    } satisfies ReminderSendPayload;
  });

  if (!payload) {
    return 'skipped';
  }

  await sendSiteFixAccessReminderEmail(payload);
  return 'sent';
}

export async function sendSiteFixAccessReminders(): Promise<{
  sent: number;
  skipped: number;
}> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const now = new Date();
  const snapshot = await adminDb
    .collectionGroup('fixSessions')
    .where('stage', '==', 'awaiting_access')
    .get();

  if (snapshot.empty) {
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const sessionDoc of snapshot.docs) {
    const uid = sessionDoc.ref.parent.parent?.id;
    if (!uid) {
      skipped += 1;
      continue;
    }

    const orderId = sessionDoc.id;

    try {
      const result = await trySendReminderForSession({
        db: adminDb,
        uid,
        orderId,
        now,
      });

      if (result === 'sent') {
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      console.error(
        `[Access Reminders] Failed for uid=${uid} orderId=${orderId}:`,
        error
      );
      skipped += 1;
    }
  }

  return { sent, skipped };
}
