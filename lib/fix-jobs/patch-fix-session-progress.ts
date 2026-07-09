import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import {
  getPillarForSignal,
  getPlaybookEntry,
  type AllFixSignalKey,
} from '@/lib/audit/fixPlaybook';
import { buildClientPillarProgress, fixPillarToClientKey } from '@/lib/fix-jobs/pillar-rollup';
import { adminDb } from '@/lib/firebase/admin';
import type {
  FixSessionDoc,
  SignalProgress,
  SignalProgressStatus,
} from '@/lib/types/fix-session';

export type ProgressPatchError = {
  status: 400 | 404 | 409;
  error: string;
};

export type ProgressPatchSuccess = {
  signalKey: string;
  status: SignalProgressStatus;
};

export type SignalProgressAction =
  | { type: 'set_steps'; completedStepIds: string[] }
  | {
      type: 'set_status';
      status: SignalProgressStatus;
      note?: string;
    }
  | { type: 'set_note'; note: string }
  | { type: 'set_phase0'; complete: boolean };

function deriveStatusFromSteps(
  entry: ReturnType<typeof getPlaybookEntry>,
  completedStepIds: string[]
): SignalProgressStatus {
  const allStepIds = entry.steps.map((step) => step.id);
  const allChecked = allStepIds.every((id) => completedStepIds.includes(id));
  const someChecked = completedStepIds.length > 0;

  if (allChecked) {
    return 'done';
  }

  if (someChecked) {
    return 'in_progress';
  }

  return 'pending';
}

export function applySignalProgressUpdate(params: {
  session: FixSessionDoc;
  signalKey: string;
  action: Exclude<SignalProgressAction, { type: 'set_phase0' }>;
}): { updatedProgress: SignalProgress; updatedSession: FixSessionDoc } | ProgressPatchError {
  const { session, signalKey, action } = params;

  if (!session.phase0Complete) {
    return {
      status: 409,
      error: 'Complete Phase 0 (backup + baseline) first',
    };
  }

  const existingProgress = session.fixProgress?.[signalKey];
  if (!existingProgress || !('completedStepIds' in existingProgress)) {
    return {
      status: 400,
      error: 'Signal key not found in this session',
    };
  }

  const entry = getPlaybookEntry(signalKey as AllFixSignalKey);
  let updatedProgress: SignalProgress = { ...existingProgress };

  if (action.type === 'set_steps') {
    const validIds = new Set(entry.steps.map((step) => step.id));
    const invalid = action.completedStepIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return {
        status: 400,
        error: `Invalid step IDs: ${invalid.join(', ')}`,
      };
    }

    const derivedStatus = deriveStatusFromSteps(entry, action.completedStepIds);
    updatedProgress = {
      ...existingProgress,
      completedStepIds: action.completedStepIds,
      status: derivedStatus,
    };

    if (derivedStatus === 'done' && !existingProgress.completedAt) {
      updatedProgress.completedAt = Timestamp.now();
    }
  } else if (action.type === 'set_status') {
    if (action.status === 'not_applicable' && !action.note?.trim()) {
      return {
        status: 400,
        error: 'A note is required when marking not applicable',
      };
    }

    updatedProgress = {
      ...existingProgress,
      status: action.status,
      ...(action.note?.trim() ? { note: action.note.trim() } : {}),
    };

    if (action.status === 'done' && !existingProgress.completedAt) {
      updatedProgress.completedAt = Timestamp.now();
    }

    if (action.status === 'pending' || action.status === 'in_progress') {
      delete updatedProgress.completedAt;
    }
  } else {
    updatedProgress = {
      ...existingProgress,
      note: action.note.trim(),
    };
  }

  const updatedSession: FixSessionDoc = {
    ...session,
    fixProgress: {
      ...(session.fixProgress ?? {}),
      [signalKey]: updatedProgress,
    },
  };

  return { updatedProgress, updatedSession };
}

export async function patchFixSessionProgress(params: {
  uid: string;
  sessionId: string;
  signalKey?: string;
  action:
    | { type: 'set_phase0'; complete: boolean }
    | Exclude<SignalProgressAction, { type: 'set_phase0' }>;
}): Promise<ProgressPatchSuccess | ProgressPatchError> {
  if (!adminDb) {
    return { status: 400, error: 'Server configuration error' };
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(params.uid)
    .collection('fixSessions')
    .doc(params.sessionId);

  if (params.action.type === 'set_phase0') {
    const { complete } = params.action;

    try {
      await adminDb.runTransaction(async (transaction) => {
        const snap = await transaction.get(sessionRef);
        if (!snap.exists) {
          throw new Error('NOT_FOUND');
        }

        transaction.update(sessionRef, {
          phase0Complete: complete,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return { status: 404, error: 'Fix job not found' };
      }

      throw error;
    }

    return { signalKey: '', status: 'pending' };
  }

  if (!params.signalKey) {
    return { status: 400, error: 'signalKey is required for this action' };
  }

  const signalAction = params.action;

  let result: ProgressPatchSuccess | ProgressPatchError | null = null;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(sessionRef);
      if (!snap.exists) {
        throw new Error('NOT_FOUND');
      }

      const session = snap.data() as FixSessionDoc;
      const applied = applySignalProgressUpdate({
        session,
        signalKey: params.signalKey!,
        action: signalAction,
      });

      if ('error' in applied) {
        result = applied;
        throw new Error('PATCH_ERROR');
      }

      const pillar = getPillarForSignal(params.signalKey as AllFixSignalKey);
      const clientKey = fixPillarToClientKey(pillar);
      const pillarProgress = buildClientPillarProgress(applied.updatedSession, pillar);

      const updatePayload: Record<string, unknown> = {
        [`fixProgress.${params.signalKey}`]: applied.updatedProgress,
        [`fixProgress.${clientKey}`]: {
          ...pillarProgress,
          updatedAt: FieldValue.serverTimestamp(),
          ...(pillarProgress.status === 'done' && pillarProgress.completedAt == null
            ? { completedAt: FieldValue.serverTimestamp() }
            : {}),
        },
        updatedAt: FieldValue.serverTimestamp(),
        ...buildAntiDriftQaUpdates(session, params.signalKey!),
      };

      transaction.update(sessionRef, updatePayload);

      result = {
        signalKey: params.signalKey!,
        status: applied.updatedProgress.status,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { status: 404, error: 'Fix job not found' };
    }

    if (error instanceof Error && error.message === 'PATCH_ERROR') {
      return result ?? { status: 400, error: 'Failed to update progress' };
    }

    throw error;
  }

  if (!result) {
    return { status: 400, error: 'Failed to update progress' };
  }

  return result;
}

export function buildAntiDriftQaUpdates(
  session: FixSessionDoc,
  signalKey: string
): Record<string, unknown> {
  const pillar = getPillarForSignal(signalKey as AllFixSignalKey);
  const existingDecision = session.qa?.decisions?.[pillar];

  if (existingDecision?.status !== 'passed') {
    return {};
  }

  return {
    [`qa.decisions.${pillar}`]: FieldValue.delete(),
    [`qa.perPillar.${pillar}`]: 'in_progress',
    'qa.passedAt': FieldValue.delete(),
  };
}
