import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { AfterAuditSnapshot } from '@/lib/types/fix-session';

export type PillarDiff = {
  gradeBefore: string;
  gradeAfter: string;
  improved: boolean;
  resolved: string[];
  remaining: string[];
  introduced: string[];
  status: 'completed' | 'failed' | 'not_purchased';
};

export type AuditDiff = {
  speed?: PillarDiff;
  security?: PillarDiff;
  seo?: PillarDiff;
};

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'] as const;

export function isGradeImproved(gradeBefore: string, gradeAfter: string): boolean {
  const beforeIndex = GRADE_ORDER.indexOf(gradeBefore as (typeof GRADE_ORDER)[number]);
  const afterIndex = GRADE_ORDER.indexOf(gradeAfter as (typeof GRADE_ORDER)[number]);

  if (beforeIndex === -1 || afterIndex === -1) {
    return false;
  }

  return afterIndex < beforeIndex;
}

function diffSignalLists(baseline: string[], after: string[]): {
  resolved: string[];
  remaining: string[];
  introduced: string[];
} {
  const baselineSet = new Set(baseline);
  const afterSet = new Set(after);

  return {
    resolved: baseline.filter((key) => !afterSet.has(key)),
    remaining: baseline.filter((key) => afterSet.has(key)),
    introduced: after.filter((key) => !baselineSet.has(key)),
  };
}

function buildPillarDiff(params: {
  gradeBefore: string;
  afterPillar:
    | AfterAuditSnapshot['speed']
    | AfterAuditSnapshot['security']
    | AfterAuditSnapshot['seo']
    | undefined;
  baselineSignals: string[];
  afterSignals: string[];
}): PillarDiff {
  if (!params.afterPillar) {
    return {
      gradeBefore: params.gradeBefore,
      gradeAfter: 'N/A',
      improved: false,
      resolved: [],
      remaining: [],
      introduced: [],
      status: 'failed',
    };
  }

  if (params.afterPillar.status === 'failed') {
    return {
      gradeBefore: params.gradeBefore,
      gradeAfter: 'N/A',
      improved: false,
      resolved: [],
      remaining: [],
      introduced: [],
      status: 'failed',
    };
  }

  const signalDiff = diffSignalLists(params.baselineSignals, params.afterSignals);

  return {
    gradeBefore: params.gradeBefore,
    gradeAfter: params.afterPillar.grade,
    improved: isGradeImproved(params.gradeBefore, params.afterPillar.grade),
    ...signalDiff,
    status: 'completed',
  };
}

export type AfterAuditPillars = Pick<AfterAuditSnapshot, 'speed' | 'security' | 'seo'>;

export function diffAuditSnapshots(
  baseline: AuditLeadDoc,
  after: AfterAuditPillars,
  entitlements: FixPillar[]
): AuditDiff {
  const diff: AuditDiff = {};

  if (entitlements.includes('speed')) {
    diff.speed = buildPillarDiff({
      gradeBefore: baseline.speedGrade,
      afterPillar: after.speed,
      baselineSignals: baseline.speedTopIssues,
      afterSignals: after.speed?.topIssues ?? [],
    });
  }

  if (entitlements.includes('security')) {
    diff.security = buildPillarDiff({
      gradeBefore: baseline.securityGrade,
      afterPillar: after.security,
      baselineSignals: baseline.securityFlags,
      afterSignals: after.security?.flags ?? [],
    });
  }

  if (entitlements.includes('seo_ai_visibility')) {
    diff.seo = buildPillarDiff({
      gradeBefore: baseline.seoGrade,
      afterPillar: after.seo,
      baselineSignals: baseline.seoFailingSignals,
      afterSignals: after.seo?.failingSignals ?? [],
    });
  }

  return diff;
}

export function countResolvedSignals(pillarDiff: PillarDiff | undefined): number {
  return pillarDiff?.resolved.length ?? 0;
}

export function countBaselineSignals(
  baseline: AuditLeadDoc,
  entitlements: FixPillar[],
  pillar: 'speed' | 'security' | 'seo'
): number {
  if (pillar === 'speed' && entitlements.includes('speed')) {
    return baseline.speedTopIssues.length;
  }

  if (pillar === 'security' && entitlements.includes('security')) {
    return baseline.securityFlags.length;
  }

  if (pillar === 'seo' && entitlements.includes('seo_ai_visibility')) {
    return baseline.seoFailingSignals.length;
  }

  return 0;
}
