import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import type {
  FixJob,
  FixJobDelivery,
  FixJobEntitlements,
  FixJobQA,
  FixJobReport,
  FixJobStage,
  FixJobStatus,
  FixJobTriage,
} from '@/lib/types/fix-job';

/**
 * Firestore collection for admin fix jobs.
 * Path: fixJobs/{fixJobId}
 */
export const FIX_JOBS_COLLECTION = 'fixJobs';

/**
 * Atomic display-ID counter document.
 * Path: meta/fixJobCounter — field `count` (number), incremented on each new fixJob.
 */
export const FIX_JOB_COUNTER_DOC = 'meta/fixJobCounter';

const VALID_STAGES: FixJobStage[] = [
  'New',
  'Linking',
  'Triage',
  'ReadyToStart',
  'InProgress',
  'QA',
  'ReportReady',
  'Delivered',
];

const VALID_STATUSES: FixJobStatus[] = ['not_started', 'in_progress', 'done'];

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function parseStage(value: unknown): FixJobStage {
  if (typeof value === 'string' && VALID_STAGES.includes(value as FixJobStage)) {
    return value as FixJobStage;
  }

  return 'New';
}

function parseStatus(value: unknown): FixJobStatus {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as FixJobStatus)) {
    return value as FixJobStatus;
  }

  return 'not_started';
}

function parseEntitlements(data: unknown): FixJobEntitlements {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  return {
    speed: record.speed === true,
    security: record.security === true,
    seo: record.seo === true,
  };
}

function parseTriage(data: unknown): FixJobTriage | null {
  if (data == null || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const complexity = record.complexity;

  return {
    clientGoal: typeof record.clientGoal === 'string' ? record.clientGoal : null,
    complexity:
      complexity === 'Low' || complexity === 'Medium' || complexity === 'High'
        ? complexity
        : null,
    expectedTurnaround:
      typeof record.expectedTurnaround === 'string' ? record.expectedTurnaround : null,
    internalNotes: typeof record.internalNotes === 'string' ? record.internalNotes : null,
    overviewEmailSentAt: toDateOrNull(record.overviewEmailSentAt),
  };
}

function parseQA(data: unknown): FixJobQA | null {
  if (data == null || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const overallStatus = record.overallStatus;

  return {
    overallStatus:
      overallStatus === 'not_started' ||
      overallStatus === 'in_progress' ||
      overallStatus === 'passed' ||
      overallStatus === 'failed'
        ? overallStatus
        : 'not_started',
    qaCompletedAt: toDateOrNull(record.qaCompletedAt),
  };
}

function parseReport(data: unknown): FixJobReport | null {
  if (data == null || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const status = record.status;

  return {
    status:
      status === 'not_generated' || status === 'generated' || status === 'sent'
        ? status
        : 'not_generated',
    reportId: typeof record.reportId === 'string' ? record.reportId : null,
    generatedAt: toDateOrNull(record.generatedAt),
    sentAt: toDateOrNull(record.sentAt),
    previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : null,
  };
}

function parseDelivery(data: unknown): FixJobDelivery | null {
  if (data == null || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const status = record.status;

  return {
    status: status === 'not_sent' || status === 'sent' ? status : 'not_sent',
    sentAt: toDateOrNull(record.sentAt),
    deliveredAt: toDateOrNull(record.deliveredAt),
  };
}

export function mapFirestoreDocToFixJob(id: string, data: Record<string, unknown>): FixJob {
  const createdAt = toDateOrNull(data.createdAt) ?? new Date(0);
  const updatedAt = toDateOrNull(data.updatedAt) ?? createdAt;
  const lastActivityAt = toDateOrNull(data.lastActivityAt) ?? updatedAt;

  return {
    id,
    displayId: typeof data.displayId === 'string' ? data.displayId : `FJ-${id.slice(0, 4)}`,
    businessName: typeof data.businessName === 'string' ? data.businessName : '',
    primaryWebsiteUrl:
      typeof data.primaryWebsiteUrl === 'string' ? data.primaryWebsiteUrl : '',
    stage: parseStage(data.stage),
    status: parseStatus(data.status),
    entitlements: parseEntitlements(data.entitlements),
    linkedOrderId: typeof data.linkedOrderId === 'string' ? data.linkedOrderId : null,
    linkedAuditLeadId:
      typeof data.linkedAuditLeadId === 'string' ? data.linkedAuditLeadId : null,
    linkedUserId: typeof data.linkedUserId === 'string' ? data.linkedUserId : null,
    triage: parseTriage(data.triage),
    qa: parseQA(data.qa),
    report: parseReport(data.report),
    delivery: parseDelivery(data.delivery),
    createdAt,
    updatedAt,
    lastActivityAt,
    owner: typeof data.owner === 'string' ? data.owner : null,
  };
}

export function formatDisplayId(count: number): string {
  return `FJ-${String(count).padStart(4, '0')}`;
}

/**
 * Atomically increments meta/fixJobCounter and returns the next zero-padded display ID.
 */
export async function generateNextDisplayId(): Promise<string> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const counterRef = adminDb.doc(FIX_JOB_COUNTER_DOC);

  const nextCount = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const currentCount = snapshot.exists ? (snapshot.data()?.count as number | undefined) ?? 0 : 0;
    const updatedCount = currentCount + 1;

    transaction.set(
      counterRef,
      {
        count: updatedCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return updatedCount;
  });

  return formatDisplayId(nextCount);
}

export async function listFixJobs(): Promise<FixJob[]> {
  if (!adminDb) {
    console.warn('[fix-jobs] Firebase Admin not initialized — returning empty list');
    return [];
  }

  const snapshot = await adminDb
    .collection(FIX_JOBS_COLLECTION)
    .orderBy('lastActivityAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => mapFirestoreDocToFixJob(doc.id, doc.data()));
}

export async function getFixJob(fixJobId: string): Promise<FixJob | null> {
  if (!adminDb) {
    return null;
  }

  const snapshot = await adminDb.collection(FIX_JOBS_COLLECTION).doc(fixJobId).get();
  if (!snapshot.exists) {
    return null;
  }

  return mapFirestoreDocToFixJob(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export type CreateFixJobInput = {
  businessName: string;
  primaryWebsiteUrl: string;
};

export async function createFixJob(input: CreateFixJobInput): Promise<FixJob> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const displayId = await generateNextDisplayId();
  const docRef = adminDb.collection(FIX_JOBS_COLLECTION).doc();
  const now = FieldValue.serverTimestamp();

  const payload = {
    displayId,
    businessName: input.businessName.trim(),
    primaryWebsiteUrl: input.primaryWebsiteUrl.trim(),
    stage: 'New',
    status: 'not_started',
    entitlements: { speed: false, security: false, seo: false },
    linkedOrderId: null,
    linkedAuditLeadId: null,
    linkedUserId: null,
    triage: null,
    qa: null,
    report: null,
    delivery: null,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    owner: null,
  };

  await docRef.set(payload);

  const created = await docRef.get();
  return mapFirestoreDocToFixJob(created.id, created.data() as Record<string, unknown>);
}

export type UpdateFixJobInput = Partial<{
  linkedUserId: string | null;
  linkedAuditLeadId: string | null;
  linkedOrderId: string | null;
  entitlements: FixJobEntitlements;
  stage: FixJobStage;
  status: FixJobStatus;
  triage: FixJobTriage | null;
  qa: FixJobQA | null;
  report: FixJobReport | null;
  delivery: FixJobDelivery | null;
}>;

export async function updateFixJob(
  fixJobId: string,
  updates: UpdateFixJobInput
): Promise<FixJob | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const docRef = adminDb.collection(FIX_JOBS_COLLECTION).doc(fixJobId);
  const existing = await docRef.get();

  if (!existing.exists) {
    return null;
  }

  const payload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    lastActivityAt: FieldValue.serverTimestamp(),
  };

  if ('linkedUserId' in updates) payload.linkedUserId = updates.linkedUserId;
  if ('linkedAuditLeadId' in updates) payload.linkedAuditLeadId = updates.linkedAuditLeadId;
  if ('linkedOrderId' in updates) payload.linkedOrderId = updates.linkedOrderId;
  if ('entitlements' in updates && updates.entitlements) {
    payload.entitlements = updates.entitlements;
  }
  if ('stage' in updates && updates.stage) payload.stage = updates.stage;
  if ('status' in updates && updates.status) payload.status = updates.status;
  if ('triage' in updates) payload.triage = updates.triage;
  if ('qa' in updates) payload.qa = updates.qa;
  if ('report' in updates) payload.report = updates.report;
  if ('delivery' in updates) payload.delivery = updates.delivery;

  await docRef.update(payload);

  const updated = await docRef.get();
  return mapFirestoreDocToFixJob(updated.id, updated.data() as Record<string, unknown>);
}

export async function deleteFixJob(fixJobId: string): Promise<boolean> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const docRef = adminDb.collection(FIX_JOBS_COLLECTION).doc(fixJobId);
  const existing = await docRef.get();

  if (!existing.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

export async function findActiveFixJobByWebsiteUrl(
  primaryWebsiteUrl: string
): Promise<FixJob | null> {
  const { normalizeWebsiteUrl } = await import('@/lib/fix-jobs/urls');
  const normalizedTarget = normalizeWebsiteUrl(primaryWebsiteUrl);

  const jobs = await listFixJobs();
  return (
    jobs.find(
      (job) =>
        job.stage !== 'Delivered' &&
        normalizeWebsiteUrl(job.primaryWebsiteUrl) === normalizedTarget
    ) ?? null
  );
}
