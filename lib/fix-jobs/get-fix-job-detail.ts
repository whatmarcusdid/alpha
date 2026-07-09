import { adminDb } from '@/lib/firebase/admin';
import { loadRecentFixUpdates } from '@/lib/fix-jobs/load-recent-fix-updates';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixJobDetailPayload, FixSessionDoc } from '@/lib/types/fix-session';

import {
  assertFixJobDetailPayloadSanitized,
  buildFixJobDetailPayload,
} from '@/lib/fix-jobs/job-detail-server-utils';

export async function getFixJobDetail(
  uid: string,
  sessionId: string
): Promise<FixJobDetailPayload | null> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('fixSessions')
    .doc(sessionId);

  const [sessionSnap, userSnap, recentUpdates] = await Promise.all([
    sessionRef.get(),
    adminDb.collection('users').doc(uid).get(),
    loadRecentFixUpdates(uid, 10),
  ]);

  if (!sessionSnap.exists) {
    return null;
  }

  const session = sessionSnap.data() as FixSessionDoc;
  const auditLeadId = session.auditLeadId;

  if (!auditLeadId) {
    return null;
  }

  const auditSnap = await adminDb.collection('auditLeads').doc(auditLeadId).get();
  if (!auditSnap.exists) {
    return null;
  }

  const auditLead = auditSnap.data() as AuditLeadDoc;
  const userData = userSnap.exists
    ? (userSnap.data() as Record<string, unknown>)
    : {};

  return assertFixJobDetailPayloadSanitized({
    ...buildFixJobDetailPayload({
      sessionId,
      uid,
      session,
      userData,
      auditLead,
    }),
    recentUpdates,
  });
}
