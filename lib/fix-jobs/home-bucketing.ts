import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type {
  ActiveJobSummaryCounts,
  EntitlementFilter,
  FixJobEntitlements,
  FixJobListColumn,
} from '@/lib/types/fix-job';
import type { FixJobStage } from '@/lib/types/fix-session';

export type AdminHomeJob = {
  sessionId: string;
  uid: string;
  businessName: string;
  primaryWebsiteUrl: string;
  displayId: string;
  stage: FixJobStage;
  updatedAt: Date;
  entitlements: FixJobEntitlements;
};

export function getSessionListColumn(stage: FixJobStage): FixJobListColumn {
  if (stage === 'delivered') {
    return 'completed';
  }

  if (
    stage === 'ready' ||
    stage === 'in_progress' ||
    stage === 'qa' ||
    stage === 'report_ready'
  ) {
    return 'active';
  }

  return 'new';
}

export function listEntitlementsToHomeFilter(
  entitlements: FixPillar[]
): FixJobEntitlements {
  return {
    speed: entitlements.includes('speed'),
    security: entitlements.includes('security'),
    seo: entitlements.includes('seo_ai_visibility'),
  };
}

export function matchesHomeEntitlementFilter(
  job: AdminHomeJob,
  filter: EntitlementFilter
): boolean {
  if (filter === 'all') {
    return true;
  }

  return job.entitlements[filter];
}

export function computeSessionActiveSummaryCounts(
  jobs: AdminHomeJob[]
): ActiveJobSummaryCounts {
  const activeJobs = jobs.filter((job) => getSessionListColumn(job.stage) === 'active');

  return {
    readyToStart: activeJobs.filter((job) => job.stage === 'ready').length,
    inProgress: activeJobs.filter(
      (job) => job.stage === 'in_progress' || job.stage === 'qa'
    ).length,
    reportReady: activeJobs.filter((job) => job.stage === 'report_ready').length,
  };
}

export function formatRelativeUpdatedAt(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) {
    return `Updated ${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
