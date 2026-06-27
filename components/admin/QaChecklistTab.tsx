'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { patchFixJob } from '@/lib/admin/patch-fix-job';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import { countQAPassed } from '@/lib/fix-jobs/qa-logic';
import {
  QA_ITEMS,
  QA_SECTION_LABELS,
} from '@/lib/fix-jobs/qa-registry';
import {
  parseSerializedQADoc,
  type SerializedQADoc,
} from '@/lib/fix-jobs/serialize-loop';
import { parseSerializedFixJob, type SerializedFixJob } from '@/lib/fix-jobs/serialize';
import type { QAResult } from '@/lib/types/loop';

type Props = {
  job: SerializedFixJob;
  onJobUpdated: (job: SerializedFixJob) => void;
  onContinueToDelivery: () => void;
};

const SECTION_ORDER: Array<'security' | 'speed' | 'seo'> = ['security', 'speed', 'seo'];

export function QaChecklistTab({ job, onJobUpdated, onContinueToDelivery }: Props) {
  const parsedJob = parseSerializedFixJob(job);
  const [qaDoc, setQaDoc] = useState<SerializedQADoc | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const parsedQa = useMemo(
    () => (qaDoc ? parseSerializedQADoc(qaDoc) : null),
    [qaDoc]
  );

  const { passed, total, flagged } = countQAPassed(
    parsedQa?.items ?? {},
    parsedJob.entitlements
  );

  const progressPercent =
    total > 0 ? Math.round(((passed + flagged) / total) * 100) : 0;

  const canContinue = parsedQa?.overallStatus === 'passed';

  const visibleSections = SECTION_ORDER.filter((section) => {
    if (section === 'security') return parsedJob.entitlements.security;
    if (section === 'speed') return parsedJob.entitlements.speed;
    return parsedJob.entitlements.seo;
  });

  const loadQa = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}/qa`);
      const payload = await response.json();

      if (response.ok) {
        setQaDoc(payload.data as SerializedQADoc);
      }
    } finally {
      setIsLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    void loadQa();
  }, [loadQa]);

  async function updateItem(
    itemId: string,
    updates: { result?: QAResult; flagNote?: string | null }
  ): Promise<void> {
    setIsSaving(true);
    try {
      const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}/qa`, {
        method: 'PATCH',
        body: JSON.stringify({ itemId, ...updates }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update QA item');
      }

      const updated = payload.data as SerializedQADoc;
      setQaDoc(updated);

      const parsed = parseSerializedQADoc(updated);
      const currentOverall = job.qa?.overallStatus ?? 'not_started';

      if (parsed.overallStatus !== currentOverall) {
        const jobUpdate = await patchFixJob(job.id, {
          qa: {
            overallStatus: parsed.overallStatus,
            qaCompletedAt:
              parsed.overallStatus === 'passed' && parsed.qaCompletedAt
                ? parsed.qaCompletedAt.toISOString()
                : null,
          },
        });
        onJobUpdated(jobUpdate);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContinueToDelivery(): Promise<void> {
    setIsSaving(true);
    try {
      const updated = await patchFixJob(job.id, { stage: 'ReportReady' });
      onJobUpdated(updated);
      onContinueToDelivery();
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] py-8">
        <p className="text-base text-zinc-600">Loading QA checklist…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[900px] pb-32">
        <header className="mb-6">
          <h2 className="text-2xl font-bold leading-[1.35] text-gray-950">QA checklist</h2>
          <p className="mt-2 text-base leading-[1.5] text-zinc-600">
            Verify every fix before the report goes to the client. All items must pass — flag
            anything that needs attention before advancing.
          </p>
        </header>

        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#9be382] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mb-8 text-sm text-zinc-600">
          QA in progress • {passed} of {total} passed
        </p>

        <div className="space-y-10">
          {visibleSections.map((section) => {
            const sectionItems = QA_ITEMS.filter((item) => item.section === section);

            return (
              <section key={section}>
                <h3 className="mb-4 text-lg font-semibold text-gray-950">
                  {QA_SECTION_LABELS[section]}
                </h3>
                <ul className="space-y-4">
                  {sectionItems.map((item) => {
                    const itemState = parsedQa?.items[item.id] ?? {
                      result: null,
                      flagNote: null,
                    };
                    const isFlagged = itemState.result === 'flag';

                    return (
                      <li
                        key={item.id}
                        className="rounded-lg border border-gray-200 bg-white p-5"
                      >
                        <p className="text-base font-semibold text-gray-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-[1.5] text-zinc-600">
                          {item.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-zinc-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <QaActionButton
                            label="PASS"
                            selected={itemState.result === 'pass'}
                            selectedClass="border-green-600 bg-green-600 text-white"
                            onClick={() => void updateItem(item.id, { result: 'pass' })}
                            disabled={isSaving}
                          />
                          <QaActionButton
                            label="FLAG"
                            selected={itemState.result === 'flag'}
                            selectedClass="border-amber-500 bg-amber-500 text-white"
                            onClick={() => void updateItem(item.id, { result: 'flag' })}
                            disabled={isSaving}
                          />
                          <QaActionButton
                            label="FAIL"
                            selected={itemState.result === 'fail'}
                            selectedClass="border-red-600 bg-red-600 text-white"
                            onClick={() => void updateItem(item.id, { result: 'fail' })}
                            disabled={isSaving}
                          />
                        </div>

                        {isFlagged && (
                          <textarea
                            defaultValue={itemState.flagNote ?? ''}
                            placeholder="Note why this item is flagged..."
                            className="mt-4 min-h-[80px] w-full rounded-md border border-[rgba(111,121,122,0.4)] bg-white px-4 py-3 text-sm leading-[1.5] text-gray-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
                            onBlur={(event) => {
                              const value = event.target.value;
                              if (value === (itemState.flagNote ?? '')) return;
                              void updateItem(item.id, { flagNote: value });
                            }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-5 shadow-[0_-1px_20px_rgba(85,85,85,0.1)] lg:px-10">
        <div className="mx-auto flex max-w-[1408px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg leading-[1.5] text-[#545552]">
            QA in progress • {passed} of {total} passed
          </p>

          <button
            type="button"
            disabled={!canContinue || isSaving}
            onClick={() => void handleContinueToDelivery()}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 px-6 py-2 text-base font-semibold uppercase ${
              canContinue
                ? 'border-[#1D4ED8] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                : 'cursor-not-allowed border-zinc-400 text-zinc-400'
            }`}
          >
            Continue to delivery
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  );
}

type QaActionButtonProps = {
  label: string;
  selected: boolean;
  selectedClass: string;
  onClick: () => void;
  disabled: boolean;
};

function QaActionButton({
  label,
  selected,
  selectedClass,
  onClick,
  disabled,
}: QaActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[40px] rounded-lg border-2 px-4 py-2 text-sm font-semibold uppercase transition-colors ${
        selected
          ? selectedClass
          : 'border-gray-300 bg-white text-gray-950 hover:border-gray-400'
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}
