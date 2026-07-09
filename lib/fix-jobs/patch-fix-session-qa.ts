import {
  FieldValue,
  Timestamp,
  type DocumentReference,
} from 'firebase-admin/firestore';

import { diffAuditSnapshots } from '@/lib/audit/diffAuditSnapshots';
import type { FixPillar } from '@/lib/audit/fixPlaybook';
import { getManualQAItem, QA_CHECKLISTS } from '@/lib/audit/qaChecklists';
import { evaluateAutoPillar } from '@/lib/audit/qaEvaluators';
import { adminDb } from '@/lib/firebase/admin';
import { parseEntitlementsFromSiteFix } from '@/lib/fix-jobs/job-detail-utils';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixSessionDoc, PillarQAStatus } from '@/lib/types/fix-session';

export type QaPatchError = {
  status: 400 | 404 | 409;
  error: string;
};

export type QaPatchSuccess = {
  perPillar: { [pillar in FixPillar]?: PillarQAStatus };
};

export type QaPatchAction =
  | {
      type: 'set_manual_check';
      pillar: FixPillar;
      itemId: string;
      checked: boolean;
    }
  | {
      type: 'decide';
      pillar: FixPillar;
      status: 'passed' | 'failed';
      note?: string;
    };

export async function patchFixSessionQa(params: {
  uid: string;
  sessionId: string;
  adminUid: string;
  action: QaPatchAction;
}): Promise<QaPatchSuccess | QaPatchError> {
  if (!adminDb) {
    return { status: 400, error: 'Server configuration error' };
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(params.uid)
    .collection('fixSessions')
    .doc(params.sessionId);

  const userRef = adminDb.collection('users').doc(params.uid);

  if (params.action.type === 'set_manual_check') {
    return patchManualCheck({
      sessionRef,
      userRef,
      action: params.action,
    });
  }

  return patchQaDecision({
    sessionRef,
    userRef,
    adminUid: params.adminUid,
    action: params.action,
  });
}

async function patchManualCheck(params: {
  sessionRef: DocumentReference;
  userRef: DocumentReference;
  action: Extract<QaPatchAction, { type: 'set_manual_check' }>;
}): Promise<QaPatchSuccess | QaPatchError> {
  const manualItem = getManualQAItem(params.action.pillar, params.action.itemId);
  if (!manualItem) {
    return { status: 400, error: 'Invalid QA item' };
  }

  let result: QaPatchSuccess | QaPatchError | undefined;

  try {
    await adminDb!.runTransaction(async (transaction) => {
      const [sessionSnap, userSnap] = await Promise.all([
        transaction.get(params.sessionRef),
        transaction.get(params.userRef),
      ]);

      if (!sessionSnap.exists) {
        throw new Error('NOT_FOUND');
      }

      const session = sessionSnap.data() as FixSessionDoc;
      const siteFix =
        userSnap.exists && userSnap.data()?.siteFix && typeof userSnap.data()?.siteFix === 'object'
          ? (userSnap.data()?.siteFix as Record<string, unknown>)
          : undefined;
      const entitlements = parseEntitlementsFromSiteFix(siteFix);

      if (!entitlements.includes(params.action.pillar)) {
        result = { status: 400, error: 'Pillar not purchased' };
        throw new Error('QA_ERROR');
      }

      const currentPerPillar = session.qa?.perPillar ?? {};
      const updates: Record<string, unknown> = {
        [`qa.manualChecks.${params.action.pillar}.${params.action.itemId}`]: {
          checked: params.action.checked,
          at: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      };

      const nextStatus =
        (currentPerPillar[params.action.pillar] ?? 'not_started') === 'not_started'
          ? 'in_progress'
          : currentPerPillar[params.action.pillar];

      if (nextStatus === 'in_progress' && currentPerPillar[params.action.pillar] !== 'in_progress') {
        updates[`qa.perPillar.${params.action.pillar}`] = 'in_progress';
      }

      transaction.update(params.sessionRef, updates);

      result = {
        perPillar: {
          ...currentPerPillar,
          [params.action.pillar]: nextStatus,
        },
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { status: 404, error: 'Fix job not found' };
    }

    if (error instanceof Error && error.message === 'QA_ERROR') {
      return result ?? { status: 400, error: 'Failed to update QA' };
    }

    throw error;
  }

  return result ?? { status: 400, error: 'Failed to update QA' };
}

async function patchQaDecision(params: {
  sessionRef: DocumentReference;
  userRef: DocumentReference;
  adminUid: string;
  action: Extract<QaPatchAction, { type: 'decide' }>;
}): Promise<QaPatchSuccess | QaPatchError> {
  const sessionSnap = await params.sessionRef.get();
  if (!sessionSnap.exists) {
    return { status: 404, error: 'Fix job not found' };
  }

  const preSession = sessionSnap.data() as FixSessionDoc;
  const auditLeadId = preSession.auditLeadId;
  if (!auditLeadId) {
    return { status: 404, error: 'Audit lead not found' };
  }

  const auditSnap = await adminDb!.collection('auditLeads').doc(auditLeadId).get();
  if (!auditSnap.exists) {
    return { status: 404, error: 'Audit lead not found' };
  }

  const auditLead = auditSnap.data() as AuditLeadDoc;

  let result: QaPatchSuccess | QaPatchError | undefined;

  try {
    await adminDb!.runTransaction(async (transaction) => {
      const [sessionSnapTx, userSnap] = await Promise.all([
        transaction.get(params.sessionRef),
        transaction.get(params.userRef),
      ]);

      if (!sessionSnapTx.exists) {
        throw new Error('NOT_FOUND');
      }

      const session = sessionSnapTx.data() as FixSessionDoc;

      if (session.stage !== 'qa') {
        result = { status: 409, error: 'Job is not in QA stage' };
        throw new Error('QA_ERROR');
      }

      const siteFix =
        userSnap.exists && userSnap.data()?.siteFix && typeof userSnap.data()?.siteFix === 'object'
          ? (userSnap.data()?.siteFix as Record<string, unknown>)
          : undefined;
      const entitlements = parseEntitlementsFromSiteFix(siteFix);

      if (!entitlements.includes(params.action.pillar)) {
        result = { status: 400, error: 'Pillar not purchased' };
        throw new Error('QA_ERROR');
      }

      const after = session.afterAudit ?? {};
      const diff = diffAuditSnapshots(auditLead, after, entitlements);
      const autoResults = evaluateAutoPillar(
        params.action.pillar,
        session,
        auditLead,
        diff
      );

      const currentPerPillar = { ...(session.qa?.perPillar ?? {}) };

      if (params.action.status === 'passed') {
        const manualItems = QA_CHECKLISTS[params.action.pillar].filter(
          (item) => item.kind === 'manual'
        );
        const manualChecks = session.qa?.manualChecks?.[params.action.pillar] ?? {};
        const unchecked = manualItems.filter((item) => !manualChecks[item.id]?.checked);

        if (unchecked.length > 0) {
          result = {
            status: 409,
            error: `Cannot pass: unchecked manual items: ${unchecked.map((item) => item.label).join(', ')}`,
          };
          throw new Error('QA_ERROR');
        }

        const hasRedOrGray = Object.values(autoResults).some(
          (value) => value === 'fail' || value === 'unavailable'
        );

        if (hasRedOrGray && !params.action.note?.trim()) {
          result = {
            status: 409,
            error:
              'Override note required: one or more auto-checks are red or unavailable',
          };
          throw new Error('QA_ERROR');
        }

        const decision = {
          status: 'passed' as const,
          ...(hasRedOrGray ? { overrideNote: params.action.note!.trim() } : {}),
          at: Timestamp.now(),
          by: params.adminUid,
        };

        currentPerPillar[params.action.pillar] = 'passed';

        const updates: Record<string, unknown> = {
          [`qa.decisions.${params.action.pillar}`]: decision,
          [`qa.perPillar.${params.action.pillar}`]: 'passed',
          updatedAt: FieldValue.serverTimestamp(),
        };

        const allPassed = entitlements.every(
          (pillar) => currentPerPillar[pillar] === 'passed'
        );
        if (allPassed) {
          updates['qa.passedAt'] = FieldValue.serverTimestamp();
        }

        transaction.update(params.sessionRef, updates);
        result = { perPillar: currentPerPillar };
        return;
      }

      if (!params.action.note?.trim()) {
        result = { status: 400, error: 'A note is required when failing QA' };
        throw new Error('QA_ERROR');
      }

      const decision = {
        status: 'failed' as const,
        note: params.action.note.trim(),
        at: Timestamp.now(),
        by: params.adminUid,
      };

      currentPerPillar[params.action.pillar] = 'failed';

      transaction.update(params.sessionRef, {
        [`qa.decisions.${params.action.pillar}`]: decision,
        [`qa.perPillar.${params.action.pillar}`]: 'failed',
        updatedAt: FieldValue.serverTimestamp(),
      });

      result = { perPillar: currentPerPillar };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { status: 404, error: 'Fix job not found' };
    }

    if (error instanceof Error && error.message === 'QA_ERROR') {
      return result ?? { status: 400, error: 'Failed to update QA' };
    }

    throw error;
  }

  return result ?? { status: 400, error: 'Failed to update QA' };
}
