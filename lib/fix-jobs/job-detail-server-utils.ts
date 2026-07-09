import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';

import type { FixPillar } from '@/lib/audit/fixPlaybook';
import { computeAllAutoEvals } from '@/lib/audit/qaEvaluators';
import { resolveSessionStage } from '@/lib/fix-jobs/helpers';
import {
  parseEntitlementsFromSiteFix,
  serializeSignalProgress,
  timestampToIso,
} from '@/lib/fix-jobs/job-detail-utils';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixJobDetailPayload, FixSessionDoc } from '@/lib/types/fix-session';

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
