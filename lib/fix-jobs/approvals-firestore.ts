import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { initializeLoopDocs } from '@/lib/fix-jobs/loops-firestore';
import { FIX_JOBS_COLLECTION, updateFixJob } from '@/lib/fix-jobs/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { FixJobEntitlements } from '@/lib/types/fix-job';
import type { ApprovalDoc, ApprovalGate } from '@/lib/types/loop';

export async function createExecutionStartApproval(
  fixJobId: string,
  approvedBy: string,
  entitlements: FixJobEntitlements
): Promise<ApprovalDoc> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const approvalRef = adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('approvals')
    .doc();

  const gate: ApprovalGate = 'execution_start';

  await approvalRef.set({
    gate,
    approvedBy,
    approvedAt: FieldValue.serverTimestamp(),
  });

  await initializeLoopDocs(fixJobId, entitlements);
  await updateFixJob(fixJobId, { stage: 'InProgress' });

  const snapshot = await approvalRef.get();
  const data = snapshot.data() as Record<string, unknown>;
  const approvedAt = data.approvedAt;

  return {
    gate,
    approvedBy,
    approvedAt:
      approvedAt instanceof Timestamp ? approvedAt.toDate() : new Date(),
  };
}
