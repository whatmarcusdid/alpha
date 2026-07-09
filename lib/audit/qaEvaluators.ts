import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import {
  getPillarForSignal,
  type AllFixSignalKey,
  type FixPillar,
} from '@/lib/audit/fixPlaybook';
import { QA_CHECKLISTS } from '@/lib/audit/qaChecklists';
import {
  diffAuditSnapshots,
  type AuditDiff,
} from '@/lib/audit/diffAuditSnapshots';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixSessionDoc } from '@/lib/types/fix-session';

export type EvalResult = 'pass' | 'fail' | 'unavailable';

type EvaluatorFn = (
  session: FixSessionDoc,
  auditLead: AuditLeadDoc,
  diff: AuditDiff | null,
  pillar: FixPillar
) => EvalResult;

function timestampToMillis(value: Timestamp | string | undefined): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export const QA_AUTO_EVALUATORS: Record<string, EvaluatorFn> = {
  snapshot_fresh: (session, _, __, pillar) => {
    const snap = session.afterAudit;
    if (!snap) {
      return 'unavailable';
    }

    const pillarSnap =
      pillar === 'speed'
        ? snap.speed
        : pillar === 'security'
          ? snap.security
          : snap.seo;

    if (!pillarSnap || pillarSnap.status === 'failed') {
      return 'unavailable';
    }

    const capturedAt = timestampToMillis(snap.capturedAt);
    if (capturedAt == null) {
      return 'unavailable';
    }

    const pillarSignals = Object.entries(session.fixProgress ?? {}).filter(
      ([key]) => getPillarForSignal(key as AllFixSignalKey) === pillar
    );

    if (pillarSignals.length === 0) {
      return 'pass';
    }

    const allCompletedBefore = pillarSignals.every(([, progress]) => {
      const completedMs = timestampToMillis(progress.completedAt);
      if (completedMs == null) {
        return false;
      }

      return capturedAt > completedMs;
    });

    return allCompletedBefore ? 'pass' : 'fail';
  },

  grade_improved: (_, __, diff, pillar) => {
    if (!diff) {
      return 'unavailable';
    }

    const pillarDiff =
      pillar === 'speed'
        ? diff.speed
        : pillar === 'seo_ai_visibility'
          ? diff.seo
          : undefined;

    if (!pillarDiff || pillarDiff.status === 'failed') {
      return 'unavailable';
    }

    return pillarDiff.improved ? 'pass' : 'fail';
  },

  signals_resolved: (_, __, diff, pillar) => {
    if (!diff) {
      return 'unavailable';
    }

    const pillarDiff =
      pillar === 'speed'
        ? diff.speed
        : pillar === 'security'
          ? diff.security
          : diff.seo;

    if (!pillarDiff || pillarDiff.status === 'failed') {
      return 'unavailable';
    }

    return pillarDiff.remaining.length === 0 ? 'pass' : 'fail';
  },

  no_tier1_flags: (session) => {
    const snap = session.afterAudit?.security;
    if (!snap || snap.status === 'failed') {
      return 'unavailable';
    }

    const tier1 = [
      'malware_detected',
      'blacklisted',
      'phishing_detected',
      'unwanted_software_detected',
      'no_https',
    ];
    const hasTier1 = snap.flags.some((flag) => tier1.includes(flag));
    return hasTier1 ? 'fail' : 'pass';
  },

  flags_resolved: (_, __, diff) => {
    if (
      !diff?.security ||
      diff.security.status === 'failed'
    ) {
      return 'unavailable';
    }

    return diff.security.remaining.length === 0 ? 'pass' : 'fail';
  },
};

export function evaluateAutoPillar(
  pillar: FixPillar,
  session: FixSessionDoc,
  auditLead: AuditLeadDoc,
  diff: AuditDiff | null
): Record<string, EvalResult> {
  const items = QA_CHECKLISTS[pillar].filter((item) => item.kind === 'auto');

  return Object.fromEntries(
    items.map((item) => [
      item.id,
      item.autoRule && QA_AUTO_EVALUATORS[item.autoRule]
        ? QA_AUTO_EVALUATORS[item.autoRule](session, auditLead, diff, pillar)
        : 'unavailable',
    ])
  );
}

export function computeAllAutoEvals(
  session: FixSessionDoc,
  auditLead: AuditLeadDoc,
  entitlements: FixPillar[]
): Partial<Record<FixPillar, Record<string, EvalResult>>> {
  const after = session.afterAudit ?? {};
  const diff = diffAuditSnapshots(auditLead, after, entitlements);
  const result: Partial<Record<FixPillar, Record<string, EvalResult>>> = {};

  for (const pillar of entitlements) {
    result[pillar] = evaluateAutoPillar(pillar, session, auditLead, diff);
  }

  return result;
}
