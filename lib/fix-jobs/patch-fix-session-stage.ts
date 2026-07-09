import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { getPillarForSignal, type AllFixSignalKey } from '@/lib/audit/fixPlaybook';
import { canTransition } from '@/lib/fix-jobs/helpers';
import { parseEntitlementsFromSiteFix } from '@/lib/fix-jobs/job-detail-utils';
import { adminDb } from '@/lib/firebase/admin';
import type { FixJobStage, FixSessionDoc } from '@/lib/types/fix-session';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

export type StageTransitionError = {
  status: 400 | 404 | 409;
  error: string;
};

export type StageTransitionSuccess = {
  stage: FixJobStage;
};

function getIncompleteSignalKeys(
  session: FixSessionDoc,
  entitlements: SiteFixEntitlement[]
): string[] {
  const progress = session.fixProgress ?? {};

  return entitlements.flatMap((pillar) =>
    Object.entries(progress)
      .filter(([key, entry]) => {
        if (!('completedStepIds' in entry)) {
          return false;
        }

        return (
          getPillarForSignal(key as AllFixSignalKey) === pillar &&
          entry.status !== 'done' &&
          entry.status !== 'not_applicable'
        );
      })
      .map(([key]) => key)
  );
}

export function validateStageTransition(params: {
  session: FixSessionDoc;
  toStage: FixJobStage;
  entitlements: SiteFixEntitlement[];
}): StageTransitionError | null {
  const currentStage = params.session.stage ?? 'awaiting_access';

  if (currentStage === 'delivered') {
    return {
      status: 409,
      error: 'Job is delivered and cannot be transitioned further',
    };
  }

  if (params.toStage === 'report_ready' && currentStage === 'qa') {
    const unpassed = params.entitlements.filter(
      (pillar) => params.session.qa?.perPillar?.[pillar] !== 'passed'
    );
    if (unpassed.length > 0) {
      return {
        status: 409,
        error: `Cannot unlock report: unpassed pillars: ${unpassed.join(', ')}`,
      };
    }
  }

  if (!canTransition(currentStage, params.toStage)) {
    return {
      status: 409,
      error: `Cannot transition from ${currentStage} to ${params.toStage}`,
    };
  }

  if (currentStage === 'in_progress' && params.toStage === 'qa') {
    const incompleteSignals = getIncompleteSignalKeys(params.session, params.entitlements);
    if (incompleteSignals.length > 0) {
      return {
        status: 409,
        error: `Cannot move to QA: ${incompleteSignals.length} signal(s) incomplete: ${incompleteSignals.join(', ')}`,
      };
    }
  }

  return null;
}

export async function patchFixSessionStage(params: {
  uid: string;
  sessionId: string;
  toStage: FixJobStage;
  adminUid: string;
}): Promise<StageTransitionSuccess | StageTransitionError> {
  if (!adminDb) {
    return { status: 400, error: 'Server configuration error' };
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(params.uid)
    .collection('fixSessions')
    .doc(params.sessionId);

  const userRef = adminDb.collection('users').doc(params.uid);

  let result: StageTransitionSuccess | StageTransitionError | undefined;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const [sessionSnap, userSnap] = await Promise.all([
        transaction.get(sessionRef),
        transaction.get(userRef),
      ]);

      if (!sessionSnap.exists) {
        throw new Error('NOT_FOUND');
      }

      const session = sessionSnap.data() as FixSessionDoc;
      const userData = userSnap.exists
        ? (userSnap.data() as Record<string, unknown>)
        : {};
      const siteFix =
        userData.siteFix && typeof userData.siteFix === 'object'
          ? (userData.siteFix as Record<string, unknown>)
          : undefined;
      const entitlements = parseEntitlementsFromSiteFix(siteFix);

      const validationError = validateStageTransition({
        session,
        toStage: params.toStage,
        entitlements,
      });

      if (validationError) {
        result = validationError;
        throw new Error('STAGE_ERROR');
      }

      transaction.update(sessionRef, {
        stage: params.toStage,
        stageHistory: FieldValue.arrayUnion({
          stage: params.toStage,
          at: Timestamp.now(),
          by: params.adminUid,
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });

      result = { stage: params.toStage };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { status: 404, error: 'Fix job not found' };
    }

    if (error instanceof Error && error.message === 'STAGE_ERROR') {
      return result ?? { status: 400, error: 'Failed to update stage' };
    }

    throw error;
  }

  if (!result) {
    return { status: 400, error: 'Failed to update stage' };
  }

  return result;
}

export async function transitionAwaitingAccessToReady(params: {
  uid: string;
  sessionId: string;
  by?: string;
}): Promise<void> {
  if (!adminDb) {
    return;
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(params.uid)
    .collection('fixSessions')
    .doc(params.sessionId);

  await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists) {
      return;
    }

    const session = snap.data() as FixSessionDoc;
    const currentStage = session.stage ?? 'awaiting_access';

    if (!canTransition(currentStage, 'ready')) {
      return;
    }

    transaction.update(sessionRef, {
      stage: 'ready',
      accessStatus: 'received',
      stageHistory: FieldValue.arrayUnion({
        stage: 'ready',
        at: Timestamp.now(),
        by: params.by ?? 'system:submit-access',
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
