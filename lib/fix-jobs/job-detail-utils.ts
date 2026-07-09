import type { Timestamp } from 'firebase-admin/firestore';

import type { AllFixSignalKey, FixPillar, PlaybookEntry } from '@/lib/audit/fixPlaybook';
import { getPillarForSignal, getPlaybookEntry } from '@/lib/audit/fixPlaybook';
import { isAllFixSignalKey } from '@/lib/fix-jobs/helpers';
import type { FixJobDetailPayload, SignalProgress } from '@/lib/types/fix-session';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

const VALID_ENTITLEMENTS: SiteFixEntitlement[] = [
  'speed',
  'security',
  'seo_ai_visibility',
];

export const PILLAR_DISPLAY_ORDER: FixPillar[] = [
  'security',
  'speed',
  'seo_ai_visibility',
];

export const PILLAR_TITLES: Record<FixPillar, string> = {
  security: 'Security',
  speed: 'Speed',
  seo_ai_visibility: 'SEO & AI Visibility',
};

const SEVERITY_RANK: Record<PlaybookEntry['severity'], number> = {
  critical: 0,
  high: 1,
  moderate: 2,
};

export function parseEntitlementsFromSiteFix(
  siteFix: Record<string, unknown> | undefined
): FixPillar[] {
  if (!siteFix) {
    return [];
  }

  const raw =
    Array.isArray(siteFix.entitlements) && siteFix.entitlements.length > 0
      ? siteFix.entitlements
      : siteFix.purchasedPackages;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (value): value is FixPillar =>
      typeof value === 'string' &&
      VALID_ENTITLEMENTS.includes(value as SiteFixEntitlement)
  );
}

export function timestampToIso(value: Timestamp | undefined): string {
  if (!value || typeof value.toDate !== 'function') {
    return new Date(0).toISOString();
  }

  return value.toDate().toISOString();
}

export function serializeSignalProgress(
  progress: SignalProgress
): FixJobDetailPayload['fixProgress'][string] {
  return {
    status: progress.status,
    completedStepIds: progress.completedStepIds,
    planSource: progress.planSource,
    ...(progress.note ? { note: progress.note } : {}),
    ...(progress.completedAt
      ? { completedAt: timestampToIso(progress.completedAt) }
      : {}),
  };
}

export function getBaselineGradeFromDetail(
  pillar: FixPillar,
  baseline: FixJobDetailPayload['baseline']
): string {
  switch (pillar) {
    case 'speed':
      return baseline.speedGrade;
    case 'security':
      return baseline.securityGrade;
    case 'seo_ai_visibility':
      return baseline.seoGrade;
  }
}

export function getSignalKeysForPillar(
  fixProgress: FixJobDetailPayload['fixProgress'],
  pillar: FixPillar
): AllFixSignalKey[] {
  return (Object.keys(fixProgress) as string[])
    .filter(isAllFixSignalKey)
    .filter((key) => getPillarForSignal(key) === pillar)
    .sort((a, b) => {
      const entryA = getPlaybookEntry(a);
      const entryB = getPlaybookEntry(b);
      const severityDiff =
        SEVERITY_RANK[entryA.severity] - SEVERITY_RANK[entryB.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }

      return entryA.title.localeCompare(entryB.title);
    });
}

export function gradeBadgeClass(grade: string): string {
  if (grade === 'A' || grade === 'B') {
    return 'bg-green-100 text-green-800';
  }

  if (grade === 'C') {
    return 'bg-amber-100 text-amber-800';
  }

  if (grade === 'D' || grade === 'F') {
    return 'bg-red-100 text-red-800';
  }

  return 'bg-gray-100 text-gray-700';
}

export function severityBadgeClass(
  severity: PlaybookEntry['severity']
): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-amber-100 text-amber-800';
    case 'moderate':
      return 'bg-gray-100 text-gray-700';
  }
}

export function accessNeededLabel(
  accessNeeded: PlaybookEntry['steps'][number]['accessNeeded']
): string | null {
  switch (accessNeeded) {
    case 'wp_admin':
      return 'WP Admin';
    case 'hosting_panel':
      return 'Hosting Panel';
    case 'sftp':
      return 'SFTP';
    case 'external_tool':
      return 'External Tool';
    case 'none':
      return null;
  }
}

export function signalStatusLabel(
  status: FixJobDetailPayload['fixProgress'][string]['status']
): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in_progress':
      return 'In Progress';
    case 'done':
      return 'Done';
    case 'not_applicable':
      return 'Not Applicable';
  }
}

export function signalStatusClass(
  status: FixJobDetailPayload['fixProgress'][string]['status']
): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'done':
      return 'bg-green-100 text-green-800';
    case 'not_applicable':
      return 'bg-gray-100 text-gray-500 line-through';
  }
}

export function shouldShowCredentialReveal(stage: FixJobDetailPayload['stage']): boolean {
  return stage !== 'awaiting_access';
}

export function shouldShowAwaitingAccessBanner(
  stage: FixJobDetailPayload['stage']
): boolean {
  return stage === 'awaiting_access';
}

export function shouldMuteJobContent(stage: FixJobDetailPayload['stage']): boolean {
  return stage === 'awaiting_access';
}

export function credentialHideSecondsRemaining(elapsedSeconds: number): number {
  return Math.max(0, 60 - elapsedSeconds);
}

export function shouldUnmountCredentials(elapsedSeconds: number): boolean {
  return elapsedSeconds >= 60;
}
