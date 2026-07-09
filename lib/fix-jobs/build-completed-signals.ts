import {
  getPillarForSignal,
  getPlaybookEntry,
  type AllFixSignalKey,
  type FixPillar,
} from '@/lib/audit/fixPlaybook';
import { isAllFixSignalKey } from '@/lib/fix-jobs/helpers';
import type { FixSessionDoc } from '@/lib/types/fix-session';

const SEVERITY_ORDER: Record<'critical' | 'high' | 'moderate', number> = {
  critical: 0,
  high: 1,
  moderate: 2,
};

export type CompletedSignalEntry = {
  signalKey: string;
  displayName: string;
  clientSummary: string;
};

export function buildCompletedSignals(
  session: FixSessionDoc,
  entitlements: FixPillar[]
): Partial<Record<FixPillar, CompletedSignalEntry[]>> {
  const result: Partial<Record<FixPillar, CompletedSignalEntry[]>> = {};
  const progress = session.fixProgress ?? {};

  for (const pillar of entitlements) {
    const entries: CompletedSignalEntry[] = [];

    for (const [signalKey, signalProgress] of Object.entries(progress)) {
      if (signalProgress.status !== 'done') {
        continue;
      }

      if (!isAllFixSignalKey(signalKey)) {
        continue;
      }

      if (getPillarForSignal(signalKey as AllFixSignalKey) !== pillar) {
        continue;
      }

      const playbook = getPlaybookEntry(signalKey as AllFixSignalKey);
      entries.push({
        signalKey,
        displayName: playbook.title,
        clientSummary: playbook.clientSummaryTemplate,
      });
    }

    entries.sort(
      (a, b) =>
        SEVERITY_ORDER[getPlaybookEntry(a.signalKey as AllFixSignalKey).severity] -
        SEVERITY_ORDER[getPlaybookEntry(b.signalKey as AllFixSignalKey).severity]
    );

    result[pillar] = entries;
  }

  return result;
}
