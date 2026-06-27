import type {
  ActiveJobSummaryCounts,
  EntitlementFilter,
  FixJob,
  FixJobListColumn,
} from '@/lib/types/fix-job';

export function getFixJobListColumn(job: FixJob): FixJobListColumn {
  if (job.status === 'done') {
    return 'completed';
  }

  if (job.status === 'in_progress') {
    return 'active';
  }

  return 'new';
}

export function matchesEntitlementFilter(
  job: FixJob,
  filter: EntitlementFilter
): boolean {
  if (filter === 'all') {
    return true;
  }

  return job.entitlements[filter];
}

export function computeActiveSummaryCounts(jobs: FixJob[]): ActiveJobSummaryCounts {
  const activeJobs = jobs.filter((job) => getFixJobListColumn(job) === 'active');

  return {
    readyToStart: activeJobs.filter((job) => job.stage === 'ReadyToStart').length,
    inProgress: activeJobs.filter(
      (job) => job.stage === 'InProgress' || job.stage === 'QA'
    ).length,
    reportReady: activeJobs.filter((job) => job.stage === 'ReportReady').length,
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

export function getStatusBadgeLabel(job: FixJob): string {
  if (job.status === 'done') {
    return 'Done';
  }

  if (job.status === 'in_progress') {
    return 'In Progress';
  }

  return 'Not Started';
}

export type StatusBadgeVariant = 'not_started' | 'in_progress' | 'done';

export function getStatusBadgeVariant(job: FixJob): StatusBadgeVariant {
  if (job.status === 'done') {
    return 'done';
  }

  if (job.status === 'in_progress') {
    return 'in_progress';
  }

  return 'not_started';
}
