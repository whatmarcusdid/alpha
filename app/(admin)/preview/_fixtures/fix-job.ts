import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type { FixJobDetailPayload, FixJobStage } from '@/lib/types/fix-session';
import type { HostingContextPayload } from '@/lib/types/hosting-context';
import type { RecentFixUpdate } from '@/lib/types/fix-update';

export const FIXTURE_UID = 'preview-uid-001';
export const FIXTURE_SESSION_ID = 'preview-session-001';
export const FIXTURE_ORDER_ID = 'TSG-4471';
export const FIXTURE_AUDIT_LEAD_ID = 'AL-PREVIEW-4471';

export const FIXTURE_CUSTOMER = {
  customerName: 'Marcus Smith',
  customerEmail: 'marcus@smithsplumbing.com',
  businessName: "Smith's Plumbing",
  siteUrl: 'https://smithsplumbing.com',
};

export const FIXTURE_BASELINE = {
  speedGrade: 'F',
  speedTopIssues: [
    'oversized_images',
    'render_blocking_resources',
    'unused_css_js',
    'slow_server_response',
  ],
  securityGrade: 'C',
  securityFlags: [] as string[],
  seoGrade: 'D',
  seoFailingSignals: [] as string[],
};

export const FIXTURE_ENTITLEMENTS = ['speed'] as const satisfies readonly FixPillar[];

export const FIXTURE_HOSTING_CONTEXT_UNCONFIRMED: HostingContextPayload = {
  host: '',
  cms: 'wordpress',
  cmsVersion: '',
  plugins: [],
  isConfirmed: false,
};

export const FIXTURE_HOSTING_CONTEXT_CONFIRMED: HostingContextPayload = {
  host: 'godaddy_cpanel',
  cms: 'wordpress',
  cmsVersion: '6.4.2',
  plugins: ['WP Rocket', 'Yoast SEO', 'WPForms'],
  confirmedAt: '2024-06-15T09:00:00.000Z',
  confirmedBy: 'admin-uid',
  isConfirmed: true,
};

export const FIXTURE_FIX_PROGRESS_EMPTY: FixJobDetailPayload['fixProgress'] = {
  oversized_images: { status: 'pending', completedStepIds: [], planSource: 'generic' },
  render_blocking_resources: { status: 'pending', completedStepIds: [], planSource: 'generic' },
  unused_css_js: { status: 'pending', completedStepIds: [], planSource: 'generic' },
  slow_server_response: { status: 'pending', completedStepIds: [], planSource: 'generic' },
};

export const FIXTURE_FIX_PROGRESS_IN_PROGRESS: FixJobDetailPayload['fixProgress'] = {
  oversized_images: {
    status: 'done',
    completedStepIds: [
      'oversized_images_1',
      'oversized_images_2',
      'oversized_images_3',
      'oversized_images_4',
      'oversized_images_5',
    ],
    planSource: 'generic',
    completedAt: '2024-06-15T10:00:00.000Z',
  },
  render_blocking_resources: {
    status: 'in_progress',
    completedStepIds: ['render_blocking_resources_1', 'render_blocking_resources_2'],
    planSource: 'generic',
  },
  unused_css_js: { status: 'pending', completedStepIds: [], planSource: 'generic' },
  slow_server_response: { status: 'pending', completedStepIds: [], planSource: 'generic' },
};

export const FIXTURE_FIX_PROGRESS_COMPLETE: FixJobDetailPayload['fixProgress'] = {
  oversized_images: {
    status: 'done',
    completedStepIds: [
      'oversized_images_1',
      'oversized_images_2',
      'oversized_images_3',
      'oversized_images_4',
      'oversized_images_5',
    ],
    planSource: 'generic',
    completedAt: '2024-06-15T10:00:00.000Z',
  },
  render_blocking_resources: {
    status: 'done',
    completedStepIds: [
      'render_blocking_resources_1',
      'render_blocking_resources_2',
      'render_blocking_resources_3',
      'render_blocking_resources_4',
      'render_blocking_resources_5',
    ],
    planSource: 'generic',
    completedAt: '2024-06-15T11:00:00.000Z',
  },
  unused_css_js: {
    status: 'done',
    completedStepIds: ['unused_css_js_1', 'unused_css_js_2', 'unused_css_js_3', 'unused_css_js_4'],
    planSource: 'generic',
    completedAt: '2024-06-15T12:00:00.000Z',
  },
  slow_server_response: {
    status: 'done',
    completedStepIds: [
      'slow_server_response_1',
      'slow_server_response_2',
      'slow_server_response_3',
      'slow_server_response_4',
      'slow_server_response_5',
    ],
    planSource: 'generic',
    completedAt: '2024-06-15T13:00:00.000Z',
  },
};

export const FIXTURE_RECENT_UPDATES: RecentFixUpdate[] = [
  {
    id: 'u1',
    message:
      'We compressed and resized your largest images so your pages load faster.',
    createdAt: '2024-06-15T10:15:00.000Z',
    pillar: 'speed',
    visibility: 'client',
    pinned: false,
  },
  {
    id: 'u2',
    message:
      'We stopped scripts from blocking your page while it loads, so visitors see your content sooner.',
    createdAt: '2024-06-15T11:30:00.000Z',
    pillar: 'speed',
    visibility: 'client',
    pinned: false,
  },
];

export const FIXTURE_AFTER_AUDIT: NonNullable<FixJobDetailPayload['afterAudit']> = {
  capturedAt: '2024-06-15T14:00:00.000Z',
  speed: { grade: 'B', score: 78, topIssues: [], status: 'completed' },
};

export const FIXTURE_QA_IN_PROGRESS: NonNullable<FixJobDetailPayload['qaData']> = {
  perPillar: { speed: 'in_progress' },
  manualChecks: { speed: {} },
  decisions: {},
  passedAt: null,
  autoEvals: {
    speed: {
      snapshot_fresh: 'pass',
      grade_improved: 'pass',
      signals_resolved: 'pass',
    },
  },
};

export const FIXTURE_QA_PASSED: NonNullable<FixJobDetailPayload['qaData']> = {
  perPillar: { speed: 'passed' },
  manualChecks: {
    speed: {
      loads_correctly: { checked: true, at: '2024-06-15T14:30:00.000Z' },
      no_breakage: { checked: true, at: '2024-06-15T14:31:00.000Z' },
    },
  },
  decisions: {
    speed: { status: 'passed', at: '2024-06-15T14:35:00.000Z', by: 'admin-uid' },
  },
  passedAt: '2024-06-15T14:35:00.000Z',
  autoEvals: {
    speed: {
      snapshot_fresh: 'pass',
      grade_improved: 'pass',
      signals_resolved: 'pass',
    },
  },
};

export const FIXTURE_REPORT_NOT_GENERATED: NonNullable<FixJobDetailPayload['reportData']> = {
  status: 'not_generated',
  reportId: null,
  generatedAt: null,
  sentAt: null,
  deliveryNote: null,
  qaOverrideNotes: {},
  reportUrl: null,
  loomUrl: null,
  deliveryStatus: null,
};

export const FIXTURE_REPORT_GENERATED: NonNullable<FixJobDetailPayload['reportData']> = {
  status: 'generated',
  reportId: 'report-preview-001',
  generatedAt: '2024-06-15T15:00:00.000Z',
  sentAt: null,
  deliveryNote: null,
  qaOverrideNotes: {},
  reportUrl: '/admin/preview/delivery-in-progress#report',
  loomUrl: null,
  deliveryStatus: 'in_progress',
};

export const FIXTURE_REPORT_SENT: NonNullable<FixJobDetailPayload['reportData']> = {
  status: 'sent',
  reportId: 'report-preview-001',
  generatedAt: '2024-06-15T15:00:00.000Z',
  sentAt: '2024-06-15T15:30:00.000Z',
  deliveryNote: null,
  qaOverrideNotes: {},
  reportUrl: '/admin/preview/delivery-complete#report',
  loomUrl: 'https://www.loom.com/share/preview',
  deliveryStatus: 'delivered',
};

type PreviewDetailInput = {
  stage: FixJobStage;
  hostingContext: HostingContextPayload;
  fixProgress: FixJobDetailPayload['fixProgress'];
  phase0Complete: boolean;
  recentUpdates: RecentFixUpdate[];
  qaData: FixJobDetailPayload['qaData'];
  afterAudit: FixJobDetailPayload['afterAudit'];
  reportData: FixJobDetailPayload['reportData'];
  siteAccessRequest: FixJobDetailPayload['siteAccessRequest'];
};

function reportFromReportData(
  reportData: FixJobDetailPayload['reportData']
): FixJobDetailPayload['report'] {
  if (!reportData || reportData.status === 'not_generated') {
    return { status: 'not_generated' };
  }

  return {
    status: reportData.status,
    reportId: reportData.reportId ?? undefined,
    generatedAt: reportData.generatedAt ?? undefined,
    sentAt: reportData.sentAt ?? undefined,
    deliveryNote: reportData.deliveryNote,
  };
}

export function buildPreviewDetail(input: PreviewDetailInput): FixJobDetailPayload {
  const qaData = input.qaData;
  const reportData = input.reportData;

  return {
    sessionId: FIXTURE_SESSION_ID,
    uid: FIXTURE_UID,
    stage: input.stage,
    stageHistory: [
      { stage: 'ready', at: '2024-06-14T09:00:00.000Z', by: 'system' },
      ...(input.stage !== 'ready'
        ? [{ stage: input.stage, at: '2024-06-15T09:00:00.000Z', by: 'admin-uid' }]
        : []),
    ],
    phase0Complete: input.phase0Complete,
    customerName: FIXTURE_CUSTOMER.customerName,
    customerEmail: FIXTURE_CUSTOMER.customerEmail,
    businessName: FIXTURE_CUSTOMER.businessName,
    siteUrl: FIXTURE_CUSTOMER.siteUrl,
    entitlements: [...FIXTURE_ENTITLEMENTS],
    auditLeadId: FIXTURE_AUDIT_LEAD_ID,
    orderId: FIXTURE_ORDER_ID,
    baseline: FIXTURE_BASELINE,
    fixProgress: input.fixProgress,
    qa: qaData
      ? {
          perPillar: qaData.perPillar,
          ...(qaData.passedAt ? { passedAt: qaData.passedAt } : {}),
        }
      : null,
    qaData,
    afterAudit: input.afterAudit,
    report: reportFromReportData(reportData),
    reportData,
    updatedAt: '2024-06-15T09:00:00.000Z',
    recentUpdates: input.recentUpdates,
    siteAccessRequest: input.siteAccessRequest,
    hostingContext: input.hostingContext,
  };
}

export const PREVIEW_DETAIL_JOB_SETUP_EMPTY = buildPreviewDetail({
  stage: 'ready',
  hostingContext: FIXTURE_HOSTING_CONTEXT_UNCONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_EMPTY,
  phase0Complete: false,
  recentUpdates: [],
  qaData: null,
  afterAudit: null,
  reportData: FIXTURE_REPORT_NOT_GENERATED,
  siteAccessRequest: null,
});

export const PREVIEW_DETAIL_JOB_SETUP_FILLED = buildPreviewDetail({
  stage: 'in_progress',
  hostingContext: FIXTURE_HOSTING_CONTEXT_CONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_EMPTY,
  phase0Complete: true,
  recentUpdates: [],
  qaData: null,
  afterAudit: null,
  reportData: FIXTURE_REPORT_NOT_GENERATED,
  siteAccessRequest: null,
});

export const PREVIEW_DETAIL_FIX_EXECUTION = buildPreviewDetail({
  stage: 'in_progress',
  hostingContext: FIXTURE_HOSTING_CONTEXT_CONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_IN_PROGRESS,
  phase0Complete: true,
  recentUpdates: FIXTURE_RECENT_UPDATES,
  qaData: null,
  afterAudit: null,
  reportData: FIXTURE_REPORT_NOT_GENERATED,
  siteAccessRequest: null,
});

export const PREVIEW_DETAIL_QA_IN_PROGRESS = buildPreviewDetail({
  stage: 'qa',
  hostingContext: FIXTURE_HOSTING_CONTEXT_CONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_COMPLETE,
  phase0Complete: true,
  recentUpdates: FIXTURE_RECENT_UPDATES,
  qaData: FIXTURE_QA_IN_PROGRESS,
  afterAudit: FIXTURE_AFTER_AUDIT,
  reportData: FIXTURE_REPORT_NOT_GENERATED,
  siteAccessRequest: null,
});

export const PREVIEW_DETAIL_QA_PASSED = buildPreviewDetail({
  stage: 'report_ready',
  hostingContext: FIXTURE_HOSTING_CONTEXT_CONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_COMPLETE,
  phase0Complete: true,
  recentUpdates: FIXTURE_RECENT_UPDATES,
  qaData: FIXTURE_QA_PASSED,
  afterAudit: FIXTURE_AFTER_AUDIT,
  reportData: FIXTURE_REPORT_NOT_GENERATED,
  siteAccessRequest: null,
});

export const PREVIEW_DETAIL_DELIVERY_IN_PROGRESS = buildPreviewDetail({
  stage: 'report_ready',
  hostingContext: FIXTURE_HOSTING_CONTEXT_CONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_COMPLETE,
  phase0Complete: true,
  recentUpdates: FIXTURE_RECENT_UPDATES,
  qaData: FIXTURE_QA_PASSED,
  afterAudit: FIXTURE_AFTER_AUDIT,
  reportData: FIXTURE_REPORT_GENERATED,
  siteAccessRequest: null,
});

export const PREVIEW_DETAIL_DELIVERY_COMPLETE = buildPreviewDetail({
  stage: 'delivered',
  hostingContext: FIXTURE_HOSTING_CONTEXT_CONFIRMED,
  fixProgress: FIXTURE_FIX_PROGRESS_COMPLETE,
  phase0Complete: true,
  recentUpdates: FIXTURE_RECENT_UPDATES,
  qaData: FIXTURE_QA_PASSED,
  afterAudit: FIXTURE_AFTER_AUDIT,
  reportData: FIXTURE_REPORT_SENT,
  siteAccessRequest: null,
});
