export type FixJobStage =
  | 'New'
  | 'Linking'
  | 'Triage'
  | 'ReadyToStart'
  | 'InProgress'
  | 'QA'
  | 'ReportReady'
  | 'Delivered';

export type FixJobStatus = 'not_started' | 'in_progress' | 'done';

export type FixJobEntitlements = {
  speed: boolean;
  security: boolean;
  seo: boolean;
};

export type FixJobTriage = {
  clientGoal: string | null;
  complexity: 'Low' | 'Medium' | 'High' | null;
  expectedTurnaround: string | null;
  internalNotes: string | null;
  overviewEmailSentAt: Date | null;
};

export type FixJobQA = {
  overallStatus: 'not_started' | 'in_progress' | 'passed' | 'failed';
  qaCompletedAt: Date | null;
};

export type FixJobReport = {
  status: 'not_generated' | 'generated' | 'sent';
  reportId: string | null;
  generatedAt: Date | null;
  sentAt: Date | null;
  previewUrl: string | null;
};

export type FixJobDelivery = {
  status: 'not_sent' | 'sent';
  sentAt: Date | null;
  deliveredAt: Date | null;
};

export type FixJobLoopKey = 'speed' | 'security' | 'seo';

/**
 * Admin fix job record.
 *
 * Firestore path: `fixJobs/{fixJobId}`
 * Subcollections: `fixJobs/{fixJobId}/loops/{loopKey}` where loopKey is `speed` | `security` | `seo`
 *
 * Display IDs are generated via atomic counter at `meta/fixJobCounter` (see lib/fix-jobs/firestore.ts).
 */
export type FixJob = {
  id: string;
  displayId: string;
  businessName: string;
  primaryWebsiteUrl: string;
  stage: FixJobStage;
  status: FixJobStatus;
  entitlements: FixJobEntitlements;
  linkedOrderId: string | null;
  linkedAuditLeadId: string | null;
  linkedUserId: string | null;
  triage: FixJobTriage | null;
  qa: FixJobQA | null;
  report: FixJobReport | null;
  delivery: FixJobDelivery | null;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  owner: string | null;
};

export type FixJobListColumn = 'new' | 'active' | 'completed';

export type EntitlementFilter = 'all' | 'speed' | 'security' | 'seo';

export type ActiveJobSummaryCounts = {
  readyToStart: number;
  inProgress: number;
  reportReady: number;
};
