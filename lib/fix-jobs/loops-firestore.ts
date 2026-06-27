import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import {
  computeLoopStatus,
  computePhaseCompletion,
  getEnabledLoopKeys,
} from '@/lib/fix-jobs/execution-logic';
import { FIX_JOBS_COLLECTION } from '@/lib/fix-jobs/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { FixJobEntitlements } from '@/lib/types/fix-job';
import type { LoopDocV0, LoopKey, PhaseCompletion } from '@/lib/types/loop';

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function parsePhaseCompletion(data: unknown): LoopDocV0['phaseCompletion'] {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  return {
    phase0: record.phase0 === true,
    phase1: record.phase1 === true,
    phase2: record.phase2 === true,
    phase3: record.phase3 === true,
    phase4: record.phase4 === true,
  };
}

export function mapFirestoreDocToLoopDoc(
  loopKey: LoopKey,
  data: Record<string, unknown>
): LoopDocV0 {
  const status = data.status;

  return {
    loopKey,
    status:
      status === 'pending' || status === 'in_progress' || status === 'complete'
        ? status
        : 'pending',
    checkedTasks: Array.isArray(data.checkedTasks)
      ? data.checkedTasks.filter((item): item is string => typeof item === 'string')
      : [],
    phaseCompletion: parsePhaseCompletion(data.phaseCompletion),
    completedAt: toDateOrNull(data.completedAt),
  };
}

function loopDocRef(fixJobId: string, loopKey: LoopKey) {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  return adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('loops')
    .doc(loopKey);
}

export async function getLoopDoc(
  fixJobId: string,
  loopKey: LoopKey
): Promise<LoopDocV0 | null> {
  if (!adminDb) {
    return null;
  }

  const snapshot = await loopDocRef(fixJobId, loopKey).get();
  if (!snapshot.exists) {
    return null;
  }

  return mapFirestoreDocToLoopDoc(loopKey, snapshot.data() as Record<string, unknown>);
}

export async function listLoopDocs(fixJobId: string): Promise<LoopDocV0[]> {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('loops')
    .get();

  return snapshot.docs.map((doc) =>
    mapFirestoreDocToLoopDoc(doc.id as LoopKey, doc.data() as Record<string, unknown>)
  );
}

export async function initializeLoopDocs(
  fixJobId: string,
  entitlements: FixJobEntitlements
): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const loopKeys = getEnabledLoopKeys(entitlements);
  const batch = adminDb.batch();

  for (const loopKey of loopKeys) {
    const ref = loopDocRef(fixJobId, loopKey);
    batch.set(ref, {
      loopKey,
      status: 'pending',
      checkedTasks: [],
      phaseCompletion: {
        phase0: false,
        phase1: false,
        phase2: false,
        phase3: false,
        phase4: false,
      },
      completedAt: null,
    });
  }

  await batch.commit();
}

export type ToggleLoopTaskInput = {
  fixJobId: string;
  loopKey: LoopKey;
  taskId: string;
  checked: boolean;
  entitlements: FixJobEntitlements;
};

export async function toggleLoopTask(input: ToggleLoopTaskInput): Promise<LoopDocV0 | null> {
  const { fixJobId, loopKey, taskId, checked, entitlements } = input;

  const ref = loopDocRef(fixJobId, loopKey);
  const existing = await ref.get();

  if (!existing.exists) {
    return null;
  }

  const current = mapFirestoreDocToLoopDoc(
    loopKey,
    existing.data() as Record<string, unknown>
  );

  const checkedTasks = checked
    ? [...new Set([...current.checkedTasks, taskId])]
    : current.checkedTasks.filter((id) => id !== taskId);

  const phaseCompletion = computePhaseCompletion(checkedTasks, entitlements);
  const status = computeLoopStatus({ checkedTasks, status: current.status }, loopKey, entitlements);
  const completedAt = status === 'complete' ? FieldValue.serverTimestamp() : null;

  await ref.update({
    checkedTasks: checked
      ? FieldValue.arrayUnion(taskId)
      : FieldValue.arrayRemove(taskId),
    phaseCompletion,
    status,
    completedAt,
  });

  const updated = await ref.get();
  return mapFirestoreDocToLoopDoc(loopKey, updated.data() as Record<string, unknown>);
}

export async function updateLoopDocFields(
  fixJobId: string,
  loopKey: LoopKey,
  fields: Partial<{
    checkedTasks: string[];
    phaseCompletion: PhaseCompletion;
    status: LoopDocV0['status'];
    completedAt: Date | null;
  }>
): Promise<LoopDocV0 | null> {
  const ref = loopDocRef(fixJobId, loopKey);
  const existing = await ref.get();

  if (!existing.exists) {
    return null;
  }

  const payload: Record<string, unknown> = {};

  if ('checkedTasks' in fields) payload.checkedTasks = fields.checkedTasks;
  if ('phaseCompletion' in fields) payload.phaseCompletion = fields.phaseCompletion;
  if ('status' in fields) payload.status = fields.status;
  if ('completedAt' in fields) {
    payload.completedAt = fields.completedAt ? Timestamp.fromDate(fields.completedAt) : null;
  }

  await ref.update(payload);

  const updated = await ref.get();
  return mapFirestoreDocToLoopDoc(loopKey, updated.data() as Record<string, unknown>);
}
