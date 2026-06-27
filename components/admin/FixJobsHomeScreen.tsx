'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';

import { CreateFixJobModal } from '@/components/admin/CreateFixJobModal';
import { CampaignGoalsWidget } from '@/components/admin/CampaignGoalsWidget';
import { FixJobCard } from '@/components/admin/FixJobCard';
import {
  computeActiveSummaryCounts,
  getFixJobListColumn,
  matchesEntitlementFilter,
} from '@/lib/fix-jobs/bucketing';
import type { EntitlementFilter, FixJob } from '@/lib/types/fix-job';

type Props = {
  jobs: FixJob[];
  adminFirstName: string;
};

const PAGE_SIZE = 3;

const entitlementFilters: EntitlementFilter[] = ['all', 'speed', 'security', 'seo'];

const entitlementFilterLabels: Record<EntitlementFilter, string> = {
  all: 'All',
  speed: 'Speed',
  security: 'Security',
  seo: 'SEO',
};

function getGreetingPrefix(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function formatHeaderDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function filterJobsBySearch(jobs: FixJob[], query: string): FixJob[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return jobs;
  }

  return jobs.filter((job) => {
    const haystack = `${job.businessName} ${job.primaryWebsiteUrl} ${job.displayId}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

type JobColumnProps = {
  title: string;
  jobs: FixJob[];
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  emptyTitle: string;
  emptyDescription: string;
  showCreateLink?: boolean;
  onCreateClick?: () => void;
};

function JobColumn({
  title,
  jobs,
  searchQuery,
  onSearchChange,
  emptyTitle,
  emptyDescription,
  showCreateLink = false,
  onCreateClick,
}: JobColumnProps) {
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const visibleJobs = jobs.slice(0, visibleCount);
  const hasMore = jobs.length > visibleCount;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">{title}</h2>
        {showCreateLink && onCreateClick && (
          <button
            type="button"
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 text-base font-bold leading-[1.5] text-[#1D4ED8] hover:underline"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Create new job
          </button>
        )}
      </div>

      {onSearchChange != null && (
        <label className="block w-full">
          <span className="sr-only">Search business name or site</span>
          <div className="flex min-h-[40px] items-center gap-2 rounded-md border border-[rgba(111,121,122,0.4)] bg-white px-5 py-3">
            <Search className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search business name or site"
              className="min-h-[40px] w-full bg-transparent text-sm leading-[1.5] tracking-[-0.14px] text-gray-950 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
        </label>
      )}

      {jobs.length === 0 ? (
        <div className="rounded bg-white p-4 text-center">
          <p className="text-base font-bold leading-[1.5] text-[#232521]">{emptyTitle}</p>
          <p className="mt-1 text-sm leading-[1.5] tracking-[-0.14px] text-[#545552]">
            {emptyDescription}
          </p>
          {showCreateLink && onCreateClick && (
            <button
              type="button"
              onClick={onCreateClick}
              className="mt-4 inline-flex items-center gap-2 text-base font-bold leading-[1.5] text-[#1D4ED8] hover:underline"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Create new job
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleJobs.map((job) => (
            <FixJobCard key={job.id} job={job} />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="self-center text-base font-bold leading-[1.5] text-[#1D4ED8] hover:underline"
            >
              Show more
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryMetricCard({
  value,
  label,
  topBarClassName,
}: {
  value: number;
  label: string;
  topBarClassName: string;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center gap-2 rounded border border-[rgba(111,121,122,0.4)] bg-white px-6 py-4">
      <div className={`absolute left-0 right-0 top-0 h-[6px] rounded-t ${topBarClassName}`} />
      <p className="pt-2 text-[40px] leading-[1.2] tracking-[-0.4px] text-[#232521]">{value}</p>
      <p className="text-center text-base leading-[1.5] text-[#545552]">{label}</p>
    </div>
  );
}

export function FixJobsHomeScreen({ jobs, adminFirstName }: Props) {
  const searchParams = useSearchParams();
  const [newJobsSearch, setNewJobsSearch] = useState<string>('');
  const [completedJobsSearch, setCompletedJobsSearch] = useState<string>('');
  const [entitlementFilter, setEntitlementFilter] = useState<EntitlementFilter>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const newJobs = useMemo(
    () => filterJobsBySearch(jobs.filter((job) => getFixJobListColumn(job) === 'new'), newJobsSearch),
    [jobs, newJobsSearch]
  );

  const activeJobs = useMemo(() => {
    const filtered = jobs
      .filter((job) => getFixJobListColumn(job) === 'active')
      .filter((job) => matchesEntitlementFilter(job, entitlementFilter));

    return filtered;
  }, [jobs, entitlementFilter]);

  const completedJobs = useMemo(
    () =>
      filterJobsBySearch(
        jobs.filter((job) => getFixJobListColumn(job) === 'completed'),
        completedJobsSearch
      ),
    [jobs, completedJobsSearch]
  );

  const summaryCounts = useMemo(() => computeActiveSummaryCounts(jobs), [jobs]);

  return (
    <div className="flex flex-col gap-6">
      <CreateFixJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <header className="flex flex-col gap-2 pb-2">
          <p className="text-lg leading-[1.5] text-zinc-600">{formatHeaderDate()}</p>
          <h1 className="text-[32px] leading-[1.2] tracking-[-0.32px] text-gray-950">
            {getGreetingPrefix()} {adminFirstName}
          </h1>
        </header>

        <CampaignGoalsWidget />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[381px_minmax(0,582px)_381px]">
        <JobColumn
          title="New jobs"
          jobs={newJobs}
          searchQuery={newJobsSearch}
          onSearchChange={setNewJobsSearch}
          showCreateLink
          onCreateClick={() => setIsCreateModalOpen(true)}
          emptyTitle="No new jobs yet"
          emptyDescription="When you create a fix job, it lands here until triage begins."
        />

        <section className="flex min-w-0 flex-col gap-6">
          <h2 className="text-2xl leading-[1.2] tracking-[-0.24px] text-gray-950">Active jobs</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryMetricCard
              value={summaryCounts.readyToStart}
              label="New jobs"
              topBarClassName="bg-[#1D4ED8]"
            />
            <SummaryMetricCard
              value={summaryCounts.inProgress}
              label="In progress"
              topBarClassName="bg-[#F0B100]"
            />
            <SummaryMetricCard
              value={summaryCounts.reportReady}
              label="Complete"
              topBarClassName="bg-[#00A63E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm leading-[1.5] tracking-[-0.14px] text-[#0A0A0A]">Filter:</span>
            {entitlementFilters.map((filter) => {
              const isSelected = entitlementFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setEntitlementFilter(filter)}
                  className={`min-h-[40px] flex-1 rounded-full border-[2.5px] px-5 py-2 text-sm font-semibold leading-[1.5] tracking-[-0.14px] transition-colors sm:flex-none ${
                    isSelected
                      ? 'border-[#1D4ED8] text-[#1D4ED8]'
                      : 'border-zinc-400 text-zinc-400 hover:border-zinc-500 hover:text-zinc-500'
                  }`}
                >
                  {entitlementFilterLabels[filter]}
                </button>
              );
            })}
          </div>

          {activeJobs.length === 0 ? (
            <div className="rounded bg-white p-4 text-center">
              <p className="text-base font-bold leading-[1.5] text-[#232521]">No active jobs yet</p>
              <p className="mt-1 text-sm leading-[1.5] tracking-[-0.14px] text-[#545552]">
                Jobs move here once triage is complete and fix execution starts.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeJobs.map((job) => (
                <FixJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        <JobColumn
          title="Completed jobs"
          jobs={completedJobs}
          searchQuery={completedJobsSearch}
          onSearchChange={setCompletedJobsSearch}
          emptyTitle="No completed jobs yet"
          emptyDescription="Jobs appear here after the final report is sent to the client."
        />
      </div>
    </div>
  );
}
