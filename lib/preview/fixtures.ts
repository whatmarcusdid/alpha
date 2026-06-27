import type { FixSession } from '@/components/dashboard/ActiveSiteFixesCard';
import type { FixJob } from '@/lib/types/fix-job';
import type { ClientContext } from '@/lib/types/client-context';
import type { FixUpdate } from '@/lib/types/fix-update';
import type { QADoc } from '@/lib/types/loop';
import type { LoopDocV0 } from '@/lib/types/loop';
import type { SerializedFixJob } from '@/lib/fix-jobs/serialize';
import type { SerializedLoopDocV0, SerializedQADoc } from '@/lib/fix-jobs/serialize-loop';
import type { CredentialDisplayRow, CredentialType } from '@/lib/types/delivery';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { serializeLoopDoc, serializeQADoc } from '@/lib/fix-jobs/serialize-loop';
import { PHASE_TASKS } from '@/lib/fix-jobs/task-registry';
import { computePhaseCompletion } from '@/lib/fix-jobs/execution-logic';
import { QA_ITEMS } from '@/lib/fix-jobs/qa-registry';
import { createEmptyQAItems } from '@/lib/fix-jobs/qa-logic';
import { buildReportFilename } from '@/lib/fix-jobs/delivery-helpers';

// ─── Shared placeholder constants ───────────────────────────────────────────

export const PREVIEW_BUSINESS_NAME = 'Bright Path Pressure Washing';
export const PREVIEW_WEBSITE_URL = 'https://brightpathpw.com';
export const PREVIEW_CONTACT_NAME = 'Jake Moreno';
export const PREVIEW_CONTACT_EMAIL = 'jake@brightpathpw.com';
export const PREVIEW_DISPLAY_ID = 'FJ-0047';
export const PREVIEW_FIX_JOB_ID = 'preview-fix-job-0047';
export const PREVIEW_USER_ID = 'preview-user-jake-moreno';
export const PREVIEW_ORDER_ID = 'preview-order-0047';
export const PREVIEW_AUDIT_ID = 'preview-audit-0047';
export const PREVIEW_ORDER_LABEL = 'Speed + Security fix · $1,798';

const BASE_DATE = new Date('2026-06-15T14:00:00.000Z');
const REPORT_DATE = new Date('2026-06-20T10:30:00.000Z');
const SENT_DATE = new Date('2026-06-20T14:41:00.000Z');
const REVOKED_DATE = new Date('2026-06-21T09:15:00.000Z');

function baseFixJob(overrides: Partial<FixJob> = {}): FixJob {
  return {
    id: PREVIEW_FIX_JOB_ID,
    displayId: PREVIEW_DISPLAY_ID,
    businessName: PREVIEW_BUSINESS_NAME,
    primaryWebsiteUrl: PREVIEW_WEBSITE_URL,
    stage: 'New',
    status: 'not_started',
    entitlements: { speed: false, security: false, seo: false },
    linkedOrderId: null,
    linkedAuditLeadId: null,
    linkedUserId: null,
    triage: null,
    qa: null,
    report: null,
    delivery: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    lastActivityAt: BASE_DATE,
    owner: null,
    ...overrides,
  };
}

function speedSecurityEntitlements(): FixJob['entitlements'] {
  return { speed: true, security: true, seo: false };
}

function phase0Tasks(): string[] {
  return PHASE_TASKS.phase0.map((task) => task.id);
}

function phase1HalfTasks(): string[] {
  return PHASE_TASKS.phase1.slice(0, 5).map((task) => task.id);
}

function buildSecurityLoopDoc(checkedTasks: string[]): LoopDocV0 {
  const entitlements = speedSecurityEntitlements();
  return {
    loopKey: 'security',
    status: checkedTasks.length === 0 ? 'pending' : 'in_progress',
    checkedTasks,
    phaseCompletion: computePhaseCompletion(checkedTasks, entitlements),
    completedAt: null,
  };
}

function buildSpeedLoopDoc(checkedTasks: string[]): LoopDocV0 {
  const entitlements = speedSecurityEntitlements();
  return {
    loopKey: 'speed',
    status: checkedTasks.length === 0 ? 'pending' : 'in_progress',
    checkedTasks,
    phaseCompletion: computePhaseCompletion(checkedTasks, entitlements),
    completedAt: null,
  };
}

function buildQaDoc(
  items: Record<string, { result: 'pass' | 'flag' | 'fail' | null; flagNote: string | null }>,
  overallStatus: QADoc['overallStatus']
): QADoc {
  return {
    overallStatus,
    qaCompletedAt: overallStatus === 'passed' ? REPORT_DATE : null,
    items,
  };
}

function allQaPassedOrFlag(): QADoc['items'] {
  const entitlements = speedSecurityEntitlements();
  const items = createEmptyQAItems(entitlements);
  for (const key of Object.keys(items)) {
    items[key] = { result: 'pass', flagNote: null };
  }
  items.spd_qa_2 = { result: 'flag', flagNote: 'Homepage LCP borderline — monitoring.' };
  return items;
}

function qaInProgressItems(): QADoc['items'] {
  const entitlements = speedSecurityEntitlements();
  const items = createEmptyQAItems(entitlements);

  for (const item of QA_ITEMS) {
    if (item.section === 'security') {
      items[item.id] = { result: 'pass', flagNote: null };
    } else if (item.id === 'spd_qa_1') {
      items[item.id] = {
        result: 'flag',
        flagNote: 'Mobile PSI improved from 34 to 41 — still below target of 50.',
      };
    } else {
      items[item.id] = { result: null, flagNote: null };
    }
  }

  return items;
}

// ─── Admin dashboard fixtures ─────────────────────────────────────────────────

export type AdminDashboardFixture = {
  fixJob: FixJob;
  defaultTab: number;
  loopDocs?: Partial<Record<'speed' | 'security' | 'seo', LoopDocV0>>;
  qaDoc?: QADoc;
  reportDoc?: { filename: string; previewUrl: string; generatedAt: Date; fileSizeBytes: number };
  accessRevocations?: Partial<
    Record<CredentialType, { revokedAt: Date }>
  >;
};

export const ADMIN_DASHBOARD_FIXTURES: Record<string, AdminDashboardFixture> = {
  'job-setup-empty': {
    defaultTab: 0,
    fixJob: baseFixJob(),
  },

  'job-setup-filled': {
    defaultTab: 0,
    fixJob: baseFixJob({
      stage: 'Linking',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
    }),
  },

  'triage-empty': {
    defaultTab: 1,
    fixJob: baseFixJob({
      stage: 'Triage',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      triage: {
        clientGoal: null,
        complexity: null,
        expectedTurnaround: null,
        internalNotes: null,
        overviewEmailSentAt: null,
      },
    }),
  },

  'triage-filled': {
    defaultTab: 1,
    fixJob: baseFixJob({
      stage: 'Triage',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      triage: {
        clientGoal: 'Improve mobile PageSpeed score and resolve mixed content warnings.',
        complexity: 'Medium',
        expectedTurnaround: '48 hours',
        internalNotes: 'WordPress + Elementor. WP Rocket already installed.',
        overviewEmailSentAt: null,
      },
    }),
  },

  'fix-execution': {
    defaultTab: 2,
    fixJob: baseFixJob({
      stage: 'InProgress',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      triage: {
        clientGoal: 'Improve mobile PageSpeed score and resolve mixed content warnings.',
        complexity: 'Medium',
        expectedTurnaround: '48 hours',
        internalNotes: 'WordPress + Elementor. WP Rocket already installed.',
        overviewEmailSentAt: null,
      },
    }),
    loopDocs: {
      security: buildSecurityLoopDoc([...phase0Tasks(), ...phase1HalfTasks()]),
      speed: buildSpeedLoopDoc(phase0Tasks()),
    },
  },

  'qa-in-progress': {
    defaultTab: 3,
    fixJob: baseFixJob({
      stage: 'QA',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      triage: {
        clientGoal: 'Improve mobile PageSpeed score and resolve mixed content warnings.',
        complexity: 'Medium',
        expectedTurnaround: '48 hours',
        internalNotes: null,
        overviewEmailSentAt: null,
      },
      qa: { overallStatus: 'in_progress', qaCompletedAt: null },
    }),
    qaDoc: buildQaDoc(qaInProgressItems(), 'in_progress'),
  },

  'qa-passed': {
    defaultTab: 3,
    fixJob: baseFixJob({
      stage: 'ReportReady',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      triage: {
        clientGoal: 'Improve mobile PageSpeed score and resolve mixed content warnings.',
        complexity: 'Medium',
        expectedTurnaround: '48 hours',
        internalNotes: null,
        overviewEmailSentAt: null,
      },
      qa: { overallStatus: 'passed', qaCompletedAt: REPORT_DATE },
    }),
    qaDoc: buildQaDoc(allQaPassedOrFlag(), 'passed'),
  },

  'delivery-in-progress': {
    defaultTab: 4,
    fixJob: baseFixJob({
      stage: 'ReportReady',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      qa: { overallStatus: 'passed', qaCompletedAt: REPORT_DATE },
      report: {
        status: 'generated',
        reportId: 'preview-report-0047',
        generatedAt: REPORT_DATE,
        sentAt: null,
        previewUrl: 'https://example.com/preview/Report_FJ-0047_BrightPathPressureWashing.pdf',
      },
      delivery: { status: 'not_sent', sentAt: null, deliveredAt: null },
    }),
    reportDoc: {
      filename: buildReportFilename(PREVIEW_DISPLAY_ID, PREVIEW_BUSINESS_NAME),
      previewUrl: 'https://example.com/preview/Report_FJ-0047_BrightPathPressureWashing.pdf',
      generatedAt: REPORT_DATE,
      fileSizeBytes: 284_672,
    },
  },

  'delivery-complete': {
    defaultTab: 4,
    fixJob: baseFixJob({
      stage: 'ReportReady',
      status: 'in_progress',
      linkedUserId: PREVIEW_USER_ID,
      linkedAuditLeadId: PREVIEW_AUDIT_ID,
      linkedOrderId: PREVIEW_ORDER_ID,
      entitlements: speedSecurityEntitlements(),
      qa: { overallStatus: 'passed', qaCompletedAt: REPORT_DATE },
      report: {
        status: 'sent',
        reportId: 'preview-report-0047',
        generatedAt: REPORT_DATE,
        sentAt: SENT_DATE,
        previewUrl: 'https://example.com/preview/Report_FJ-0047_BrightPathPressureWashing.pdf',
      },
      delivery: { status: 'sent', sentAt: SENT_DATE, deliveredAt: null },
    }),
    reportDoc: {
      filename: buildReportFilename(PREVIEW_DISPLAY_ID, PREVIEW_BUSINESS_NAME),
      previewUrl: 'https://example.com/preview/Report_FJ-0047_BrightPathPressureWashing.pdf',
      generatedAt: REPORT_DATE,
      fileSizeBytes: 284_672,
    },
    accessRevocations: {
      wordpress_admin: { revokedAt: REVOKED_DATE },
      cpanel: { revokedAt: REVOKED_DATE },
      sftp: { revokedAt: REVOKED_DATE },
    },
  },
};

export const ADMIN_PREVIEW_STATE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'job-setup-empty', label: 'Job Setup (empty)' },
  { key: 'job-setup-filled', label: 'Job Setup (filled)' },
  { key: 'triage-empty', label: 'Triage (empty)' },
  { key: 'triage-filled', label: 'Triage (filled)' },
  { key: 'fix-execution', label: 'Fix Execution' },
  { key: 'qa-in-progress', label: 'QA (in progress)' },
  { key: 'qa-passed', label: 'QA (passed)' },
  { key: 'delivery-in-progress', label: 'Delivery (in progress)' },
  { key: 'delivery-complete', label: 'Delivery (complete)' },
];

export function getAdminDashboardFixture(stateKey: string): AdminDashboardFixture {
  return ADMIN_DASHBOARD_FIXTURES[stateKey] ?? ADMIN_DASHBOARD_FIXTURES['job-setup-empty'];
}

export function serializeAdminFixture(fixture: AdminDashboardFixture): {
  job: SerializedFixJob;
  loopDocs: SerializedLoopDocV0[];
  qaDoc: SerializedQADoc | null;
} {
  const loopDocs = Object.values(fixture.loopDocs ?? {}).map(serializeLoopDoc);
  const qaDoc = fixture.qaDoc ? serializeQADoc(fixture.qaDoc) : null;

  return {
    job: serializeFixJob(fixture.fixJob),
    loopDocs,
    qaDoc,
  };
}

// ─── Client dashboard fixtures ────────────────────────────────────────────────

export type ClientDashboardPreviewFixture = {
  context: ClientContext;
  fixSession: FixSession;
  siteFix: Record<string, unknown>;
  fixUpdates: FixUpdate[];
};

const baseClientContext: ClientContext = {
  userId: PREVIEW_USER_ID,
  fullName: PREVIEW_CONTACT_NAME,
  businessName: PREVIEW_BUSINESS_NAME,
  websiteUrl: PREVIEW_WEBSITE_URL,
  email: PREVIEW_CONTACT_EMAIL,
  entitlements: ['speed', 'security'],
  packageLabel: 'Speed + Security fix',
  linkedFixSessionId: 'preview-fix-session-0047',
};

function baseFixSession(overrides: Partial<FixSession> = {}): FixSession {
  return {
    orderId: PREVIEW_ORDER_ID,
    accessStatus: null,
    deliveryStatus: null,
    estimatedCompletionAt: new Date('2026-06-22T17:00:00.000Z'),
    reportUrl: null,
    loomUrl: null,
    googleReviewUrl: null,
    onboarding: null,
    fixProgress: {
      speed: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      security: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      seo: { status: 'queued', description: null, updatedAt: null, completedAt: null },
    },
    ...overrides,
  };
}

export const CLIENT_DASHBOARD_FIXTURES: Record<string, ClientDashboardPreviewFixture> = {
  'awaiting-setup': {
    context: baseClientContext,
    siteFix: {
      orderId: PREVIEW_ORDER_ID,
      onboardingStatus: 'awaiting_access',
      inviteStatus: 'accepted',
      purchasedPackages: ['speed', 'security'],
    },
    fixSession: baseFixSession({
      deliveryStatus: 'in_progress',
      accessStatus: 'needed',
      onboarding: {
        siteUrl: 'confirmed',
        hostingAccess: 'needed',
        cmsAccess: 'needed',
        dnsAccess: 'not_needed',
        analyticsAccess: null,
      },
    }),
    fixUpdates: [],
  },

  'in-progress': {
    context: baseClientContext,
    siteFix: {
      orderId: PREVIEW_ORDER_ID,
      onboardingStatus: 'delivery_ready',
      inviteStatus: 'accepted',
      purchasedPackages: ['speed', 'security'],
      access_request: { status: 'submitted', submittedAt: BASE_DATE },
    },
    fixSession: baseFixSession({
      deliveryStatus: 'in_progress',
      accessStatus: 'received',
      fixProgress: {
        speed: {
          status: 'in_progress',
          description: 'Compressing images and configuring WP Rocket.',
          updatedAt: new Date('2026-06-18T11:00:00.000Z'),
          completedAt: null,
        },
        security: {
          status: 'in_progress',
          description: 'Installing Wordfence and hardening headers.',
          updatedAt: new Date('2026-06-17T15:30:00.000Z'),
          completedAt: null,
        },
        seo: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      },
    }),
    fixUpdates: [
      {
        id: 'update-1',
        createdAt: new Date('2026-06-18T11:00:00.000Z'),
        pillar: 'speed',
        message:
          'Started image compression via ShortPixel — processing 847 images across your media library.',
        visibility: 'client',
        pinned: false,
      },
      {
        id: 'update-2',
        createdAt: new Date('2026-06-17T15:30:00.000Z'),
        pillar: 'security',
        message:
          'SSL certificate renewed and mixed content errors cleared on homepage and service pages.',
        visibility: 'client',
        pinned: true,
      },
      {
        id: 'update-3',
        createdAt: new Date('2026-06-16T09:00:00.000Z'),
        pillar: 'general',
        message: 'Work has officially started on your Speed + Security fix.',
        visibility: 'client',
        pinned: false,
      },
    ],
  },

  delivered: {
    context: baseClientContext,
    siteFix: {
      orderId: PREVIEW_ORDER_ID,
      onboardingStatus: 'delivery_ready',
      inviteStatus: 'accepted',
      purchasedPackages: ['speed', 'security'],
      access_request: { status: 'submitted', submittedAt: BASE_DATE },
    },
    fixSession: baseFixSession({
      deliveryStatus: 'delivered',
      accessStatus: 'received',
      reportUrl: 'https://example.com/preview/Report_FJ-0047_BrightPathPressureWashing.pdf',
      loomUrl: 'https://www.loom.com/share/preview-bright-path-walkthrough',
      googleReviewUrl: 'https://g.page/r/preview/review',
      fixProgress: {
        speed: {
          status: 'done',
          description: 'Mobile PSI improved from 34 to 72.',
          updatedAt: REPORT_DATE,
          completedAt: REPORT_DATE,
        },
        security: {
          status: 'done',
          description: 'Clean Sucuri scan, grade-A security headers.',
          updatedAt: REPORT_DATE,
          completedAt: REPORT_DATE,
        },
        seo: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      },
    }),
    fixUpdates: [
      {
        id: 'update-delivered',
        createdAt: REPORT_DATE,
        pillar: 'general',
        message:
          'Your fix is complete! Download your report and watch the walkthrough video below.',
        visibility: 'client',
        pinned: true,
      },
    ],
  },
};

/** Spec alias — each entry includes a `context` field matching ClientContext. */
export const CLIENT_DASHBOARD_FIXTURES_BY_CONTEXT: Record<string, ClientContext> =
  Object.fromEntries(
    Object.entries(CLIENT_DASHBOARD_FIXTURES).map(([key, fixture]) => [key, fixture.context])
  );

export const CLIENT_PREVIEW_STATE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'awaiting-setup', label: 'Awaiting setup' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'delivered', label: 'Delivered' },
];

export function getClientDashboardFixture(stateKey: string): ClientDashboardPreviewFixture {
  return (
    CLIENT_DASHBOARD_FIXTURES[stateKey] ?? CLIENT_DASHBOARD_FIXTURES['awaiting-setup']
  );
}

export function buildPreviewCredentials(
  revocations: AdminDashboardFixture['accessRevocations']
): CredentialDisplayRow[] {
  const expiresAt = new Date('2026-07-15T00:00:00.000Z').toISOString();

  return (['wordpress_admin', 'cpanel', 'sftp'] as CredentialType[]).map((credentialType) => ({
    credentialType,
    label:
      credentialType === 'wordpress_admin'
        ? 'WordPress admin'
        : credentialType === 'cpanel'
          ? 'cPanel'
          : 'SFTP',
    granted: true,
    expiresAt,
    revokedAt: revocations?.[credentialType]?.revokedAt.toISOString() ?? null,
  }));
}
