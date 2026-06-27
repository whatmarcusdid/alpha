import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { FIX_JOBS_COLLECTION } from '@/lib/fix-jobs/firestore';
import {
  computeQAOverallStatus,
  createEmptyQAItems,
} from '@/lib/fix-jobs/qa-logic';
import { adminDb } from '@/lib/firebase/admin';
import type { FixJobEntitlements } from '@/lib/types/fix-job';
import type { QADoc, QAItemState } from '@/lib/types/loop';

export const QA_DOC_ID = 'current';

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function parseQAItems(data: unknown): Record<string, QAItemState> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const record = data as Record<string, unknown>;
  const result: Record<string, QAItemState> = {};

  for (const [itemId, value] of Object.entries(record)) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const item = value as Record<string, unknown>;
    const itemResult = item.result;

    result[itemId] = {
      result:
        itemResult === 'pass' || itemResult === 'flag' || itemResult === 'fail'
          ? itemResult
          : null,
      flagNote: typeof item.flagNote === 'string' ? item.flagNote : null,
    };
  }

  return result;
}

export function mapFirestoreDocToQADoc(data: Record<string, unknown>): QADoc {
  const overallStatus = data.overallStatus;

  return {
    overallStatus:
      overallStatus === 'not_started' ||
      overallStatus === 'in_progress' ||
      overallStatus === 'passed' ||
      overallStatus === 'failed'
        ? overallStatus
        : 'not_started',
    qaCompletedAt: toDateOrNull(data.qaCompletedAt),
    items: parseQAItems(data.items),
  };
}

function qaDocRef(fixJobId: string) {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  return adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('qa')
    .doc(QA_DOC_ID);
}

export async function getQADoc(fixJobId: string): Promise<QADoc | null> {
  if (!adminDb) {
    return null;
  }

  const snapshot = await qaDocRef(fixJobId).get();
  if (!snapshot.exists) {
    return null;
  }

  return mapFirestoreDocToQADoc(snapshot.data() as Record<string, unknown>);
}

export async function initializeQADoc(
  fixJobId: string,
  entitlements: FixJobEntitlements
): Promise<QADoc> {
  const ref = qaDocRef(fixJobId);
  const existing = await ref.get();

  if (existing.exists) {
    return mapFirestoreDocToQADoc(existing.data() as Record<string, unknown>);
  }

  const items = createEmptyQAItems(entitlements);
  const payload = {
    overallStatus: 'not_started',
    qaCompletedAt: null,
    items,
  };

  await ref.set(payload);

  return mapFirestoreDocToQADoc(payload);
}

export type UpdateQAItemInput = {
  fixJobId: string;
  itemId: string;
  result?: QAItemState['result'];
  flagNote?: string | null;
  entitlements: FixJobEntitlements;
};

export async function updateQAItem(input: UpdateQAItemInput): Promise<QADoc> {
  const { fixJobId, itemId, result, flagNote, entitlements } = input;
  const ref = qaDocRef(fixJobId);

  let qaDoc = await getQADoc(fixJobId);
  if (!qaDoc) {
    qaDoc = await initializeQADoc(fixJobId, entitlements);
  }

  const items = { ...qaDoc.items };
  const current = items[itemId] ?? { result: null, flagNote: null };

  items[itemId] = {
    result: result !== undefined ? result : current.result,
    flagNote: flagNote !== undefined ? flagNote : current.flagNote,
  };

  const overallStatus = computeQAOverallStatus(items, entitlements);
  const qaCompletedAt =
    overallStatus === 'passed' ? FieldValue.serverTimestamp() : null;

  await ref.set(
    {
      items,
      overallStatus,
      qaCompletedAt,
    },
    { merge: true }
  );

  const updated = await ref.get();
  return mapFirestoreDocToQADoc(updated.data() as Record<string, unknown>);
}
