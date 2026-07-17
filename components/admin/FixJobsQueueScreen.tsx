'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  PILLAR_CHIP_CLASS,
  PILLAR_CHIP_LABEL,
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
} from '@/lib/fix-jobs/admin-stage-styles';
import type { FixJobListItem, FixJobStage } from '@/lib/types/fix-session';

type StageFilter = FixJobStage | 'all';

type ApiResponse = {
  success: boolean;
  data: {
    jobs: FixJobListItem[];
    nextCursor?: string;
  };
};

const STAGE_TABS: Array<{ value: StageFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'awaiting_access', label: 'Awaiting Access' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'qa', label: 'QA' },
  { value: 'report_ready', label: 'Report Ready' },
  { value: 'delivered', label: 'Delivered' },
];

function parseStageFilter(value: string | null): StageFilter {
  const allowed: StageFilter[] = [
    'all',
    'awaiting_access',
    'ready',
    'in_progress',
    'qa',
    'report_ready',
    'delivered',
  ];

  if (value && allowed.includes(value as StageFilter)) {
    return value as StageFilter;
  }

  return 'all';
}

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) {
    return url;
  }

  return `${url.slice(0, maxLength - 1)}…`;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function deriveStageCounts(jobs: FixJobListItem[]): Record<StageFilter, number> {
  const counts: Record<StageFilter, number> = {
    all: jobs.length,
    awaiting_access: 0,
    ready: 0,
    in_progress: 0,
    qa: 0,
    report_ready: 0,
    delivered: 0,
  };

  for (const job of jobs) {
    counts[job.stage] += 1;
  }

  return counts;
}

function LoadingSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1024px] w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm text-zinc-600">
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Site</th>
            <th className="px-4 py-3 font-medium">Pillars</th>
            <th className="px-4 py-3 font-medium">Stage</th>
            <th className="px-4 py-3 font-medium">Next action</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index} className="border-b border-gray-100">
              {Array.from({ length: 6 }).map((__, cellIndex) => (
                <td key={cellIndex} className="px-4 py-4">
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FixJobsQueueScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageFilter = parseStageFilter(searchParams.get('stage'));

  const [jobs, setJobs] = useState<FixJobListItem[]>([]);
  const [allJobsForCounts, setAllJobsForCounts] = useState<FixJobListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const stageCounts = useMemo(
    () => deriveStageCounts(allJobsForCounts),
    [allJobsForCounts]
  );

  const fetchJobs = useCallback(async (stage: StageFilter) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs?stage=${encodeURIComponent(stage)}`
      );
      const payload = (await response.json()) as ApiResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load fix jobs');
      }

      setJobs(payload.data.jobs);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to load fix jobs';
      setError(message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllForCounts = useCallback(async () => {
    try {
      const response = await fetchWithAdminAuth('/api/admin/fix-jobs?stage=all');
      const payload = (await response.json()) as ApiResponse;

      if (response.ok) {
        setAllJobsForCounts(payload.data.jobs);
      }
    } catch {
      // Counts are non-blocking
    }
  }, []);

  useEffect(() => {
    void fetchAllForCounts();
  }, [fetchAllForCounts]);

  useEffect(() => {
    void fetchJobs(stageFilter);
  }, [fetchJobs, stageFilter]);

  const setStageFilter = (stage: StageFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stage === 'all') {
      params.delete('stage');
    } else {
      params.set('stage', stage);
    }

    const query = params.toString();
    router.replace(query ? `/admin/fix-jobs?${query}` : '/admin/fix-jobs');
  };

  const isFiltered = stageFilter !== 'all';
  const isEmpty = !loading && !error && jobs.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.24px] text-gray-950">
          Fix jobs — table view
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Site Fix fulfillment queue — every purchased job across all customers.{' '}
          <Link href="/admin" className="font-medium text-[#1D4ED8] hover:underline">
            Back to home
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGE_TABS.map((tab) => {
          const isActive = stageFilter === tab.value;
          const count = stageCounts[tab.value];

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStageFilter(tab.value)}
              className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1D4ED8] text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => void fetchJobs(stageFilter)}
            className="mt-3 min-h-[40px] rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {isEmpty && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-zinc-600">
          {isFiltered
            ? 'No jobs in this stage.'
            : 'No fix jobs yet. Jobs appear here automatically when a customer completes a Site Fix purchase.'}
        </p>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[1024px] w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-zinc-600">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Pillars</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Next action</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={`${job.uid}-${job.sessionId}`}
                  onClick={() =>
                    router.push(
                      `/admin/fix-jobs/${job.sessionId}?uid=${encodeURIComponent(job.uid)}&fromStage=${encodeURIComponent(stageFilter)}`
                    )
                  }
                  className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                    job.stage === 'awaiting_access' ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-4 align-top">
                    <p className="text-sm font-medium text-gray-950">{job.customerName}</p>
                    <p className="text-xs text-zinc-500">{job.customerEmail}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    {job.siteUrl ? (
                      <a
                        href={job.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-sm text-blue-700 hover:text-blue-800"
                      >
                        {truncateUrl(job.siteUrl)}
                      </a>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {job.entitlements.map((pillar) => (
                        <span
                          key={pillar}
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                            PILLAR_CHIP_CLASS[pillar] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {PILLAR_CHIP_LABEL[pillar] ?? pillar}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STAGE_BADGE_CLASS[job.stage]
                      }`}
                    >
                      {STAGE_LABELS[job.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-gray-950">
                    {job.nextAction}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-zinc-600">
                    {formatRelativeTime(job.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
