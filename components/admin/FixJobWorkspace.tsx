'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { DeliveryTab } from '@/components/admin/DeliveryTab';
import { FixJobHeader } from '@/components/admin/FixJobHeader';
import { FixExecutionTab } from '@/components/admin/FixExecutionTab';
import { JobSetupTab } from '@/components/admin/JobSetupTab';
import { QaChecklistTab } from '@/components/admin/QaChecklistTab';
import { TriageTab } from '@/components/admin/TriageTab';
import { isTabEnabled, type FixJobTabIndex } from '@/lib/fix-jobs/gates';
import { parseSerializedFixJob, type SerializedFixJob } from '@/lib/fix-jobs/serialize';

export type FixJobWorkspacePreviewConfig = {
  basePath: string;
  stateKey: string;
};

type FixJobWorkspaceProps = {
  initialJob: SerializedFixJob;
  preview?: FixJobWorkspacePreviewConfig;
};

const TAB_LABELS = [
  'Job Setup',
  'Triage',
  'Fix Execution',
  'QA checklist',
  'Delivery',
] as const;

function parseTabIndex(value: string | null): FixJobTabIndex {
  const parsed = Number(value);
  if (parsed >= 0 && parsed <= 4) {
    return parsed as FixJobTabIndex;
  }

  return 0;
}

export function FixJobWorkspace({ initialJob, preview }: FixJobWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [job, setJob] = useState<SerializedFixJob>(initialJob);

  const activeTab = useMemo(
    () => parseTabIndex(searchParams.get('tab')),
    [searchParams]
  );

  const parsedJob = parseSerializedFixJob(job);

  const setActiveTab = useCallback(
    (tabIndex: FixJobTabIndex) => {
      const params = new URLSearchParams(searchParams.toString());

      if (preview) {
        params.set('state', preview.stateKey);
      }

      params.set('tab', String(tabIndex));

      const path = preview
        ? `${preview.basePath}?${params.toString()}`
        : `/admin/fix-jobs/${job.id}?${params.toString()}`;

      router.replace(path, { scroll: false });
    },
    [job.id, preview, router, searchParams]
  );

  function handleTabClick(tabIndex: FixJobTabIndex) {
    if (!isTabEnabled(parsedJob, tabIndex)) {
      return;
    }

    setActiveTab(tabIndex);
  }

  return (
    <div className="pb-8">
      <FixJobHeader job={job} hideDelete={Boolean(preview)} />

      <div
        role="tablist"
        aria-label="Fix job workspace tabs"
        className="mb-6 flex gap-0 border-b border-gray-300"
      >
        {TAB_LABELS.map((label, index) => {
          const tabIndex = index as FixJobTabIndex;
          const enabled = isTabEnabled(parsedJob, tabIndex);
          const isActive = activeTab === tabIndex;

          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!enabled}
              disabled={!enabled}
              onClick={() => handleTabClick(tabIndex)}
              className={`min-h-[40px] w-[120px] border-b-[3px] px-3 py-3 text-base leading-[1.5] transition-colors ${
                isActive
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : enabled
                    ? 'border-transparent text-gray-950 hover:text-[#1D4ED8]'
                    : 'cursor-not-allowed border-transparent text-zinc-500'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 0 && (
        <JobSetupTab
          job={job}
          onJobUpdated={setJob}
          onContinueToTriage={() => setActiveTab(1)}
        />
      )}

      {activeTab === 1 && (
        <TriageTab
          job={job}
          onJobUpdated={setJob}
          onExecutionStarted={() => setActiveTab(2)}
        />
      )}

      {activeTab === 2 && (
        <FixExecutionTab
          job={job}
          onJobUpdated={setJob}
          onContinueToQa={() => setActiveTab(3)}
        />
      )}

      {activeTab === 3 && (
        <QaChecklistTab
          job={job}
          onJobUpdated={setJob}
          onContinueToDelivery={() => setActiveTab(4)}
        />
      )}

      {activeTab === 4 && <DeliveryTab job={job} onJobUpdated={setJob} />}
    </div>
  );
}
