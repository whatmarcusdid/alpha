import {
  FIX_PLAYBOOK,
  getPillarForSignal,
  type AllFixSignalKey,
  type FixPillar,
} from '@/lib/audit/fixPlaybook';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { SiteFixEntitlement } from '@/lib/types/client-context';
import type {
  FixJobStage,
  FixSessionDoc,
  PillarClientStatus,
  SignalProgress,
} from '@/lib/types/fix-session';

const ALL_SIGNAL_KEYS = new Set<string>(Object.keys(FIX_PLAYBOOK));

export function isAllFixSignalKey(key: string): key is AllFixSignalKey {
  return ALL_SIGNAL_KEYS.has(key);
}

const LEGAL_TRANSITIONS: ReadonlyMap<FixJobStage, readonly FixJobStage[]> = new Map([
  ['awaiting_access', ['ready']],
  ['ready', ['in_progress']],
  ['in_progress', ['qa']],
  ['qa', ['report_ready', 'in_progress']],
  ['report_ready', ['delivered']],
  ['delivered', []],
]);

export function canTransition(from: FixJobStage, to: FixJobStage): boolean {
  if (from === to) {
    return false;
  }

  const allowed = LEGAL_TRANSITIONS.get(from);
  return allowed?.includes(to) ?? false;
}

function isLegacyPillarFixProgress(
  progress: NonNullable<FixSessionDoc['fixProgress']>
): boolean {
  return Object.keys(progress).some(
    (key) => key === 'speed' || key === 'security' || key === 'seo'
  );
}

function getPillarSignalEntries(
  progress: Record<string, SignalProgress>,
  pillar: FixPillar
): Array<[string, SignalProgress]> {
  return Object.entries(progress).filter(([key]) => {
    if (!isAllFixSignalKey(key)) {
      return false;
    }

    return getPillarForSignal(key) === pillar;
  });
}

export function derivePillarClientStatus(
  session: FixSessionDoc,
  pillar: FixPillar
): PillarClientStatus {
  if (session.stage === 'awaiting_access') {
    return 'awaiting_access';
  }

  const progress = session.fixProgress;
  if (!progress) {
    return 'queued';
  }

  if (isLegacyPillarFixProgress(progress)) {
    return 'queued';
  }

  const pillarSignals = getPillarSignalEntries(progress, pillar);
  if (pillarSignals.length === 0) {
    return 'done';
  }

  const allComplete = pillarSignals.every(
    ([, signalProgress]) =>
      signalProgress.status === 'done' || signalProgress.status === 'not_applicable'
  );
  if (allComplete) {
    return 'done';
  }

  const anyInProgress = pillarSignals.some(
    ([, signalProgress]) =>
      signalProgress.status === 'in_progress' || signalProgress.completedStepIds.length > 0
  );
  if (anyInProgress) {
    return 'in_progress';
  }

  return 'queued';
}

const EMPTY_SIGNAL_PROGRESS: SignalProgress = {
  status: 'pending',
  completedStepIds: [],
  planSource: 'generic',
};

export function buildInitialFixProgress(
  auditLead: AuditLeadDoc,
  entitlements: SiteFixEntitlement[]
): { [signalKey: string]: SignalProgress } {
  const result: { [signalKey: string]: SignalProgress } = {};

  for (const pillar of entitlements) {
    let candidateKeys: string[] = [];

    if (pillar === 'speed') {
      candidateKeys = auditLead.speedTopIssues;
    } else if (pillar === 'security') {
      candidateKeys = auditLead.securityFlags.filter(isAllFixSignalKey);
    } else {
      candidateKeys = auditLead.seoFailingSignals;
    }

    for (const key of candidateKeys) {
      if (!isAllFixSignalKey(key)) {
        continue;
      }

      if (getPillarForSignal(key) !== pillar) {
        continue;
      }

      result[key] = { ...EMPTY_SIGNAL_PROGRESS };
    }
  }

  return result;
}

/**
 * Returns true when MVP-03 admin fields should be seeded on an existing session doc.
 * Used for webhook idempotency — never overwrite progress once stage is set.
 */
export function shouldSeedFixSessionAdminFields(
  existing: Record<string, unknown> | undefined
): boolean {
  if (!existing) {
    return true;
  }

  return existing.stage == null;
}

export function resolveSessionStage(session: FixSessionDoc): FixJobStage {
  return session.stage ?? 'awaiting_access';
}

export function countSignalProgress(fixProgress: FixSessionDoc['fixProgress']): {
  total: number;
  done: number;
} {
  if (!fixProgress) {
    return { total: 0, done: 0 };
  }

  const values = Object.values(fixProgress);
  return {
    total: values.length,
    done: values.filter(
      (entry) => entry.status === 'done' || entry.status === 'not_applicable'
    ).length,
  };
}

export function deriveNextAction(
  stage: FixJobStage,
  signalsTotal: number,
  signalsDone: number
): string {
  switch (stage) {
    case 'awaiting_access':
      return 'Waiting on customer access';
    case 'ready':
      return 'Start Phase 0';
    case 'in_progress':
      return `${signalsTotal - signalsDone} of ${signalsTotal} signals remaining`;
    case 'qa':
      return 'Complete QA checklist';
    case 'report_ready':
      return 'Generate & send report';
    case 'delivered':
      return '—';
  }
}
