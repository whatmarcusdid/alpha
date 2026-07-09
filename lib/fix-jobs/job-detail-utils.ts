import type { Timestamp } from 'firebase-admin/firestore';

import type { AllFixSignalKey, FixPillar, PlaybookEntry } from '@/lib/audit/fixPlaybook';
import { getPillarForSignal, getPlaybookEntry } from '@/lib/audit/fixPlaybook';
import { computeAllAutoEvals } from '@/lib/audit/qaEvaluators';
import { isAllFixSignalKey } from '@/lib/fix-jobs/helpers';
import type { FixJobDetailPayload, FixSessionDoc, SignalProgress } from '@/lib/types/fix-session';
import type { SiteFixEntitlement } from '@/lib/types/client-context';
import type { AuditLeadDoc } from '@/lib/types/audit';
import { resolveSessionStage } from '@/lib/fix-jobs/helpers';

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

function buildQaDataPayload(
  session: FixSessionDoc,
  auditLead: AuditLeadDoc,
  entitlements: FixPillar[]
): FixJobDetailPayload['qaData'] {
  const stage = resolveSessionStage(session);

  const perPillar = session.qa?.perPillar
    ? Object.fromEntries(
        Object.entries(session.qa.perPillar).map(([pillar, status]) => [
          pillar,
          status ?? 'not_started',
        ])
      )
    : {};

  const manualChecks = session.qa?.manualChecks
    ? Object.fromEntries(
        Object.entries(session.qa.manualChecks).map(([pillar, items]) => [
          pillar,
          Object.fromEntries(
            Object.entries(items ?? {}).map(([itemId, entry]) => [
              itemId,
              {
                checked: entry.checked,
                at: timestampToIso(entry.at),
              },
            ])
          ),
        ])
      )
    : {};

  const decisions = session.qa?.decisions
    ? Object.fromEntries(
        Object.entries(session.qa.decisions).map(([pillar, decision]) => [
          pillar,
          {
            status: decision.status,
            ...(decision.note ? { note: decision.note } : {}),
            ...(decision.overrideNote ? { overrideNote: decision.overrideNote } : {}),
            at: timestampToIso(decision.at),
            by: decision.by,
          },
        ])
      )
    : {};

  return {
    perPillar,
    manualChecks,
    decisions,
    passedAt: session.qa?.passedAt ? timestampToIso(session.qa.passedAt) : null,
    autoEvals:
      stage === 'qa' || stage === 'report_ready'
        ? computeAllAutoEvals(session, auditLead, entitlements)
        : null,
  };
}

function buildReportDataPayload(
  session: FixSessionDoc,
  entitlements: FixPillar[],
  stage: FixJobDetailPayload['stage']
): FixJobDetailPayload['reportData'] {
  const qaOverrideNotes =
    stage === 'report_ready' || stage === 'delivered'
      ? Object.fromEntries(
          entitlements
            .filter((pillar) => session.qa?.decisions?.[pillar]?.overrideNote)
            .map((pillar) => [
              pillar,
              session.qa!.decisions![pillar]!.overrideNote as string,
            ])
        )
      : {};

  return {
    status: session.report?.status ?? 'not_generated',
    reportId: session.report?.reportId ?? null,
    generatedAt: session.report?.generatedAt
      ? timestampToIso(session.report.generatedAt)
      : null,
    sentAt: session.report?.sentAt ? timestampToIso(session.report.sentAt) : null,
    deliveryNote: session.report?.deliveryNote ?? null,
    qaOverrideNotes,
    reportUrl: typeof session.reportUrl === 'string' ? session.reportUrl : null,
    loomUrl: typeof session.loomUrl === 'string' ? session.loomUrl : null,
    deliveryStatus:
      session.deliveryStatus === 'delivered'
        ? 'delivered'
        : session.deliveryStatus === 'in_progress'
          ? 'in_progress'
          : null,
  };
}

export function buildFixJobDetailPayload(params: {
  sessionId: string;
  uid: string;
  session: FixSessionDoc;
  userData: Record<string, unknown>;
  auditLead: AuditLeadDoc;
}): FixJobDetailPayload {
  const { sessionId, uid, session, userData, auditLead } = params;

  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  const siteFix =
    userData.siteFix && typeof userData.siteFix === 'object'
      ? (userData.siteFix as Record<string, unknown>)
      : undefined;

  const entitlements = parseEntitlementsFromSiteFix(siteFix);

  const customerName =
    typeof userData.fullName === 'string' && userData.fullName.trim().length > 0
      ? userData.fullName.trim()
      : typeof company?.legalName === 'string' && company.legalName.trim().length > 0
        ? company.legalName.trim()
        : 'Unknown customer';

  const businessName =
    typeof company?.legalName === 'string' && company.legalName.trim().length > 0
      ? company.legalName.trim()
      : auditLead.businessName;

  const customerEmail =
    typeof userData.email === 'string'
      ? userData.email.trim()
      : auditLead.email;

  const siteUrl =
    typeof company?.websiteUrl === 'string' && company.websiteUrl.trim().length > 0
      ? company.websiteUrl.trim()
      : auditLead.websiteUrl;

  const fixProgressEntries = session.fixProgress ?? {};
  const fixProgress = Object.fromEntries(
    Object.entries(fixProgressEntries).map(([key, value]) => [
      key,
      serializeSignalProgress(value),
    ])
  );

  return {
    sessionId,
    uid,
    stage: resolveSessionStage(session),
    stageHistory: (session.stageHistory ?? []).map((entry) => ({
      stage: entry.stage,
      at: timestampToIso(entry.at),
      by: entry.by,
    })),
    phase0Complete: session.phase0Complete ?? false,
    customerName,
    customerEmail,
    businessName,
    siteUrl,
    entitlements,
    auditLeadId: session.auditLeadId ?? auditLead.auditLeadId,
    orderId: session.orderId ?? '',
    baseline: {
      speedGrade: auditLead.speedGrade,
      speedTopIssues: auditLead.speedTopIssues,
      securityGrade: auditLead.securityGrade,
      securityFlags: auditLead.securityFlags,
      seoGrade: auditLead.seoGrade,
      seoFailingSignals: auditLead.seoFailingSignals,
    },
    fixProgress,
    qa: session.qa
      ? {
          perPillar: Object.fromEntries(
            Object.entries(session.qa.perPillar).map(([pillar, status]) => [
              pillar,
              status ?? 'not_started',
            ])
          ),
          ...(session.qa.passedAt
            ? { passedAt: timestampToIso(session.qa.passedAt) }
            : {}),
        }
      : null,
    qaData: buildQaDataPayload(session, auditLead, entitlements),
    afterAudit: session.afterAudit
      ? {
          capturedAt: timestampToIso(session.afterAudit.capturedAt),
          ...(session.afterAudit.speed ? { speed: session.afterAudit.speed } : {}),
          ...(session.afterAudit.security
            ? { security: session.afterAudit.security }
            : {}),
          ...(session.afterAudit.seo ? { seo: session.afterAudit.seo } : {}),
        }
      : null,
    report: session.report
      ? {
          status: session.report.status,
          ...(session.report.reportId ? { reportId: session.report.reportId } : {}),
          ...(session.report.generatedAt
            ? { generatedAt: timestampToIso(session.report.generatedAt) }
            : {}),
          ...(session.report.sentAt
            ? { sentAt: timestampToIso(session.report.sentAt) }
            : {}),
          ...(session.report.deliveryNote != null
            ? { deliveryNote: session.report.deliveryNote }
            : {}),
        }
      : null,
    reportData: buildReportDataPayload(session, entitlements, resolveSessionStage(session)),
    updatedAt: timestampToIso(session.updatedAt),
    recentUpdates: [],
  };
}

export function assertFixJobDetailPayloadSanitized(
  payload: FixJobDetailPayload
): FixJobDetailPayload {
  const forbidden = [
    'credentials',
    'accessToken',
    'grantToken',
    'encryptedCredentials',
    'passwordEncrypted',
    'speedNarrative',
    'securityNarrative',
    'seoNarrative',
  ];

  const serialized = JSON.stringify(payload);
  for (const term of forbidden) {
    if (serialized.includes(term)) {
      throw new Error(`Forbidden field leaked into detail payload: ${term}`);
    }
  }

  return payload;
}
