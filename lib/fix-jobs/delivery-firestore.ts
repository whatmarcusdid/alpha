import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import {
  areAllDeliveryStepsComplete,
  countDeliverySteps,
} from '@/lib/fix-jobs/delivery-helpers';
import { FIX_JOBS_COLLECTION, getFixJob, updateFixJob } from '@/lib/fix-jobs/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { SiteFixUserNamespace } from '@/lib/book-service/createUser';
import {
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPES,
  type AccessRevocationDoc,
  type CredentialDisplayRow,
  type CredentialType,
} from '@/lib/types/delivery';

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

export function mapFirestoreDocToAccessRevocation(
  credentialType: CredentialType,
  data: Record<string, unknown>
): AccessRevocationDoc {
  return {
    credentialType,
    revokedAt: toDateOrNull(data.revokedAt) ?? new Date(0),
    revokedBy: typeof data.revokedBy === 'string' ? data.revokedBy : '',
  };
}

export async function listAccessRevocations(
  fixJobId: string
): Promise<AccessRevocationDoc[]> {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('accessRevocations')
    .get();

  return snapshot.docs.map((doc) =>
    mapFirestoreDocToAccessRevocation(doc.id as CredentialType, doc.data())
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function getCredentialRowsForFixJob(
  fixJobId: string,
  linkedUserId: string | null,
  fallbackGrantedAt: Date
): Promise<CredentialDisplayRow[]> {
  const revocations = await listAccessRevocations(fixJobId);
  const revocationMap = new Map(
    revocations.map((item) => [item.credentialType, item.revokedAt])
  );

  let accessSubmittedAt: Date | null = null;

  if (linkedUserId && adminDb) {
    const userSnap = await adminDb.collection('users').doc(linkedUserId).get();
    const siteFix = userSnap.data()?.siteFix as SiteFixUserNamespace | undefined;
    const submittedAt = siteFix?.access_request?.submittedAt;

    if (submittedAt instanceof Timestamp) {
      accessSubmittedAt = submittedAt.toDate();
    } else if (submittedAt && typeof submittedAt === 'object' && 'toDate' in submittedAt) {
      accessSubmittedAt = (submittedAt as Timestamp).toDate();
    }
  }

  const grantedBase = accessSubmittedAt ?? fallbackGrantedAt;
  const expiresAt = addDays(grantedBase, 30).toISOString();

  return CREDENTIAL_TYPES.map((credentialType) => ({
    credentialType,
    label: CREDENTIAL_LABELS[credentialType],
    granted: true,
    expiresAt,
    revokedAt: revocationMap.get(credentialType)?.toISOString() ?? null,
  }));
}

export async function markDeliveryEmailSent(
  fixJobId: string
): Promise<{ sentAt: Date }> {
  const fixJob = await getFixJob(fixJobId);
  if (!fixJob) {
    throw new Error('Fix job not found');
  }

  if (fixJob.delivery?.status === 'sent' && fixJob.delivery.sentAt) {
    return { sentAt: fixJob.delivery.sentAt };
  }

  if (fixJob.report?.status !== 'generated' && fixJob.report?.status !== 'sent') {
    throw new Error('Report must be generated before marking email as sent');
  }

  const sentAt = new Date();

  await updateFixJob(fixJobId, {
    delivery: {
      status: 'sent',
      sentAt,
      deliveredAt: fixJob.delivery?.deliveredAt ?? null,
    },
    report: fixJob.report
      ? {
          status: 'sent',
          reportId: fixJob.report.reportId,
          generatedAt: fixJob.report.generatedAt,
          sentAt,
          previewUrl: fixJob.report.previewUrl,
        }
      : null,
  });

  if (adminDb && fixJob.report?.reportId) {
    await adminDb
      .collection(FIX_JOBS_COLLECTION)
      .doc(fixJobId)
      .collection('reports')
      .doc(fixJob.report.reportId)
      .update({
        status: 'sent',
        sentAt: FieldValue.serverTimestamp(),
      });
  }

  return { sentAt };
}

export async function revokeCredentialAccess(
  fixJobId: string,
  credentialType: CredentialType,
  revokedBy: string
): Promise<{ revokedAt: Date }> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const ref = adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('accessRevocations')
    .doc(credentialType);

  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() as Record<string, unknown>;
    return {
      revokedAt: toDateOrNull(data.revokedAt) ?? new Date(),
    };
  }

  await ref.set({
    credentialType,
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy,
  });

  const updated = await ref.get();
  const data = updated.data() as Record<string, unknown>;

  return {
    revokedAt: toDateOrNull(data.revokedAt) ?? new Date(),
  };
}

export async function completeFixJobDelivery(fixJobId: string): Promise<void> {
  const fixJob = await getFixJob(fixJobId);
  if (!fixJob) {
    throw new Error('Fix job not found');
  }

  if (fixJob.stage === 'Delivered') {
    return;
  }

  const revocations = await listAccessRevocations(fixJobId);
  const revokedTypes = new Set(revocations.map((item) => item.credentialType));

  const stepsComplete = areAllDeliveryStepsComplete({
    reportStatus: fixJob.report?.status,
    deliveryStatus: fixJob.delivery?.status,
    revokedTypes,
  });

  if (!stepsComplete) {
    throw new Error('All delivery steps must be complete before marking job as done');
  }

  const deliveredAt = new Date();

  await updateFixJob(fixJobId, {
    stage: 'Delivered',
    status: 'done',
    delivery: {
      status: fixJob.delivery?.status === 'sent' ? 'sent' : 'sent',
      sentAt: fixJob.delivery?.sentAt ?? deliveredAt,
      deliveredAt,
    },
  });
}

export function getDeliveryStepCountFromJob(
  fixJob: Awaited<ReturnType<typeof getFixJob>>,
  revocations: AccessRevocationDoc[]
): number {
  if (!fixJob) {
    return 0;
  }

  const revokedTypes = new Set(revocations.map((item) => item.credentialType));

  return countDeliverySteps({
    reportStatus: fixJob.report?.status,
    deliveryStatus: fixJob.delivery?.status,
    revokedTypes,
  });
}
