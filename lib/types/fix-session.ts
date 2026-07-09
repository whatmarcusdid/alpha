import type { Timestamp } from 'firebase-admin/firestore';

import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type { EvalResult } from '@/lib/audit/qaEvaluators';
import type { HostingContextPayload } from '@/lib/types/hosting-context';
import type { OnboardingData } from '@/lib/types/onboarding';
import type { RecentFixUpdate } from '@/lib/types/fix-update';
import type { SiteAccessRequestPayload } from '@/lib/types/site-access-request';

export type FixJobStage =
  | 'awaiting_access'
  | 'ready'
  | 'in_progress'
  | 'qa'
  | 'report_ready'
  | 'delivered';

export type SignalProgressStatus = 'pending' | 'in_progress' | 'done' | 'not_applicable';

export type SignalProgress = {
  status: SignalProgressStatus;
  completedStepIds: string[];
  planSource: 'generic' | 'ai';
  note?: string;
  completedAt?: Timestamp;
};

export type PillarQAStatus = 'not_started' | 'in_progress' | 'passed' | 'failed';

export type AfterAuditSnapshot = {
  capturedAt: Timestamp;
  speed?: {
    grade: string;
    score: number;
    topIssues: string[];
    status: 'completed' | 'failed';
  };
  security?: {
    grade: string;
    flags: string[];
    flagTier: string;
    status: 'completed' | 'failed';
  };
  seo?: {
    grade: string;
    score: number;
    failingSignals: string[];
    status: 'completed' | 'failed';
  };
};

export type PillarClientStatus = 'queued' | 'in_progress' | 'done' | 'awaiting_access';

/**
 * Firestore document at users/{uid}/fixSessions/{sessionId}.
 *
 * Client dashboard maps a subset of these fields into the UI `FixSession` type
 * (see ActiveSiteFixesCard). Admin fulfillment fields are written via Admin SDK only.
 */
export type FixSessionDoc = {
  // ── Existing client-facing fields (unchanged) ──────────────────────────────
  orderId?: string;
  accessStatus?: 'needed' | 'received' | null;
  deliveryStatus?: 'in_progress' | 'delivered' | null;
  estimatedCompletionAt?: Timestamp;
  reportUrl?: string | null;
  loomUrl?: string | null;
  googleReviewUrl?: string | null;
  onboarding?: OnboardingData | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // ── Admin fulfillment fields (MVP-03+) ───────────────────────────────────
  stage?: FixJobStage;
  stageHistory?: Array<{ stage: FixJobStage; at: Timestamp; by: string }>;
  /** Per-signal admin progress keyed by AllFixSignalKey */
  fixProgress?: { [signalKey: string]: SignalProgress };
  phase0Complete?: boolean;
  qa?: {
    perPillar: { [pillar in FixPillar]?: PillarQAStatus };
    passedAt?: Timestamp;
    manualChecks?: {
      [pillar in FixPillar]?: {
        [itemId: string]: { checked: boolean; at: Timestamp };
      };
    };
    decisions?: {
      [pillar in FixPillar]?: {
        status: 'passed' | 'failed';
        note?: string;
        overrideNote?: string;
        at: Timestamp;
        by: string;
      };
    };
  };
  afterAudit?: AfterAuditSnapshot;
  report?: {
    status: 'not_generated' | 'generated' | 'sent';
    reportId?: string;
    generatedAt?: Timestamp;
    sentAt?: Timestamp;
    deliveryNote?: string | null;
  };
  /** Set when a delivery email send is attempted (before Loops call). */
  deliveryAttemptAt?: Timestamp;
  auditLeadId?: string;
};

export type FixJobListItem = {
  sessionId: string;
  uid: string;
  stage: FixJobStage;
  customerName: string;
  customerEmail: string;
  siteUrl: string;
  entitlements: FixPillar[];
  nextAction: string;
  updatedAt: string;
  signalsTotal: number;
  signalsDone: number;
};

export type SerializableSignalProgress = {
  status: SignalProgressStatus;
  completedStepIds: string[];
  planSource: 'generic' | 'ai';
  note?: string;
  completedAt?: string;
};

export type FixJobDetailPayload = {
  sessionId: string;
  uid: string;
  stage: FixJobStage;
  stageHistory: Array<{ stage: FixJobStage; at: string; by: string }>;
  phase0Complete: boolean;
  customerName: string;
  customerEmail: string;
  businessName: string;
  siteUrl: string;
  entitlements: FixPillar[];
  auditLeadId: string;
  orderId: string;
  baseline: {
    speedGrade: string;
    speedTopIssues: string[];
    securityGrade: string;
    securityFlags: string[];
    seoGrade: string;
    seoFailingSignals: string[];
  };
  fixProgress: { [signalKey: string]: SerializableSignalProgress };
  qa: { perPillar: { [pillar: string]: string }; passedAt?: string } | null;
  qaData: {
    perPillar: { [pillar: string]: string };
    manualChecks: {
      [pillar: string]: {
        [itemId: string]: { checked: boolean; at: string };
      };
    };
    decisions: {
      [pillar: string]: {
        status: 'passed' | 'failed';
        note?: string;
        overrideNote?: string;
        at: string;
        by: string;
      };
    };
    passedAt: string | null;
    autoEvals: Partial<Record<FixPillar, Record<string, EvalResult>>> | null;
  } | null;
  afterAudit: {
    capturedAt: string;
    speed?: {
      grade: string;
      score: number;
      topIssues: string[];
      status: 'completed' | 'failed';
    };
    security?: {
      grade: string;
      flags: string[];
      flagTier: string;
      status: 'completed' | 'failed';
    };
    seo?: {
      grade: string;
      score: number;
      failingSignals: string[];
      status: 'completed' | 'failed';
    };
  } | null;
  report: {
    status: string;
    reportId?: string;
    generatedAt?: string;
    sentAt?: string;
    deliveryNote?: string | null;
  } | null;
  reportData: {
    status: string;
    reportId: string | null;
    generatedAt: string | null;
    sentAt: string | null;
    deliveryNote: string | null;
    qaOverrideNotes: Record<string, string>;
    reportUrl: string | null;
    loomUrl: string | null;
    deliveryStatus: 'in_progress' | 'delivered' | null;
  } | null;
  updatedAt: string;
  recentUpdates: RecentFixUpdate[];
  siteAccessRequest: SiteAccessRequestPayload | null;
  hostingContext: HostingContextPayload;
};

export type RevealedSiteFixCredentials = {
  method: string | null;
  loginUrl: string | null;
  username: string | null;
  password: string | null;
  hostingProvider: string | null;
  notes: string | null;
};
