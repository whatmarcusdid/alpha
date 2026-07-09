import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

import { buildInitialFixProgress, shouldSeedFixSessionAdminFields } from '@/lib/fix-jobs/helpers';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

export type SeedFixSessionParams = {
  userId: string;
  orderId: string;
  auditLeadId: string;
  entitlements: SiteFixEntitlement[];
  /** Optional Firestore instance (e.g. seed scripts using modular Admin SDK init). */
  firestore?: Firestore;
};

async function resolveFirestore(firestore?: Firestore): Promise<Firestore | null> {
  if (firestore) {
    return firestore;
  }

  const { adminDb } = await import('@/lib/firebase/admin');
  return adminDb;
}

export async function ensureFixSessionForOrder(
  params: SeedFixSessionParams
): Promise<void> {
  const db = await resolveFirestore(params.firestore);
  if (!db) {
    console.warn('[ensureFixSessionForOrder] Firebase Admin not initialized');
    return;
  }

  const { userId, orderId, auditLeadId, entitlements } = params;
  const sessionRef = db
    .collection('users')
    .doc(userId)
    .collection('fixSessions')
    .doc(orderId);

  const existing = await sessionRef.get();
  const existingData = existing.data() as Record<string, unknown> | undefined;

  if (!shouldSeedFixSessionAdminFields(existingData)) {
    return;
  }

  const auditSnap = await db.collection('auditLeads').doc(auditLeadId).get();
  if (!auditSnap.exists) {
    console.warn(
      `[ensureFixSessionForOrder] auditLead not found auditLeadId=${auditLeadId}`
    );
    return;
  }

  const auditLead = auditSnap.data() as AuditLeadDoc;
  const now = FieldValue.serverTimestamp();

  const adminFields = {
    stage: 'awaiting_access' as const,
    stageHistory: [],
    fixProgress: buildInitialFixProgress(auditLead, entitlements),
    phase0Complete: false,
    qa: {
      perPillar: Object.fromEntries(
        entitlements.map((pillar) => [pillar, 'not_started' as const])
      ),
    },
    report: { status: 'not_generated' as const },
    auditLeadId: auditLead.auditLeadId,
    orderId,
    updatedAt: now,
  };

  if (existing.exists) {
    await sessionRef.set(adminFields, { merge: true });
  } else {
    await sessionRef.set({
      ...adminFields,
      deliveryStatus: 'in_progress',
      accessStatus: 'needed',
      createdAt: now,
    });
  }

  await db.collection('users').doc(userId).set(
    {
      siteFix: {
        activeFixSessionId: orderId,
      },
    },
    { merge: true }
  );
}
