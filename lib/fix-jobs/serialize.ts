import type {
  FixJob,
  FixJobDelivery,
  FixJobEntitlements,
  FixJobQA,
  FixJobReport,
  FixJobTriage,
} from '@/lib/types/fix-job';

export type SerializedFixJobTriage = {
  clientGoal: string | null;
  complexity: 'Low' | 'Medium' | 'High' | null;
  expectedTurnaround: string | null;
  internalNotes: string | null;
  overviewEmailSentAt: string | null;
};

export type SerializedFixJob = {
  id: string;
  displayId: string;
  businessName: string;
  primaryWebsiteUrl: string;
  stage: FixJob['stage'];
  status: FixJob['status'];
  entitlements: FixJobEntitlements;
  linkedOrderId: string | null;
  linkedAuditLeadId: string | null;
  linkedUserId: string | null;
  triage: SerializedFixJobTriage | null;
  qa: Omit<FixJobQA, 'qaCompletedAt'> & { qaCompletedAt: string | null } | null;
  report: Omit<FixJobReport, 'generatedAt' | 'sentAt'> & {
    generatedAt: string | null;
    sentAt: string | null;
  } | null;
  delivery: Omit<FixJobDelivery, 'sentAt' | 'deliveredAt'> & {
    sentAt: string | null;
    deliveredAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  owner: string | null;
};

function serializeDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function serializeTriage(triage: FixJobTriage | null): SerializedFixJobTriage | null {
  if (!triage) {
    return null;
  }

  return {
    ...triage,
    overviewEmailSentAt: serializeDate(triage.overviewEmailSentAt),
  };
}

export function serializeFixJob(job: FixJob): SerializedFixJob {
  return {
    id: job.id,
    displayId: job.displayId,
    businessName: job.businessName,
    primaryWebsiteUrl: job.primaryWebsiteUrl,
    stage: job.stage,
    status: job.status,
    entitlements: job.entitlements,
    linkedOrderId: job.linkedOrderId,
    linkedAuditLeadId: job.linkedAuditLeadId,
    linkedUserId: job.linkedUserId,
    triage: serializeTriage(job.triage),
    qa: job.qa
      ? {
          ...job.qa,
          qaCompletedAt: serializeDate(job.qa.qaCompletedAt),
        }
      : null,
    report: job.report
      ? {
          ...job.report,
          generatedAt: serializeDate(job.report.generatedAt),
          sentAt: serializeDate(job.report.sentAt),
        }
      : null,
    delivery: job.delivery
      ? {
          ...job.delivery,
          sentAt: serializeDate(job.delivery.sentAt),
          deliveredAt: serializeDate(job.delivery.deliveredAt),
        }
      : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    lastActivityAt: job.lastActivityAt.toISOString(),
    owner: job.owner,
  };
}

export function parseSerializedFixJob(data: SerializedFixJob): FixJob {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    lastActivityAt: new Date(data.lastActivityAt),
    triage: data.triage
      ? {
          ...data.triage,
          overviewEmailSentAt: data.triage.overviewEmailSentAt
            ? new Date(data.triage.overviewEmailSentAt)
            : null,
        }
      : null,
    qa: data.qa
      ? {
          ...data.qa,
          qaCompletedAt: data.qa.qaCompletedAt ? new Date(data.qa.qaCompletedAt) : null,
        }
      : null,
    report: data.report
      ? {
          ...data.report,
          generatedAt: data.report.generatedAt ? new Date(data.report.generatedAt) : null,
          sentAt: data.report.sentAt ? new Date(data.report.sentAt) : null,
        }
      : null,
    delivery: data.delivery
      ? {
          ...data.delivery,
          sentAt: data.delivery.sentAt ? new Date(data.delivery.sentAt) : null,
          deliveredAt: data.delivery.deliveredAt
            ? new Date(data.delivery.deliveredAt)
            : null,
        }
      : null,
  };
}
