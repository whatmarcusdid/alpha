'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';

import { patchFixJob } from '@/lib/admin/patch-fix-job';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  areAllPhasesComplete,
  countCompletedPhases,
  getLoopKeysForTask,
  isPhaseApplicable,
} from '@/lib/fix-jobs/execution-logic';
import { isExecutionStarted } from '@/lib/fix-jobs/gates';
import {
  parseSerializedLoopDoc,
  type SerializedLoopDocV0,
} from '@/lib/fix-jobs/serialize-loop';
import { parseSerializedFixJob, type SerializedFixJob } from '@/lib/fix-jobs/serialize';
import { PHASE_LABELS, PHASE_TASKS, type PhaseKey } from '@/lib/fix-jobs/task-registry';

type Props = {
  job: SerializedFixJob;
  onJobUpdated: (job: SerializedFixJob) => void;
  onContinueToQa: () => void;
};

const PHASE_ORDER: PhaseKey[] = ['phase0', 'phase1', 'phase2', 'phase3', 'phase4'];

export function FixExecutionTab({ job, onJobUpdated, onContinueToQa }: Props) {
  const parsedJob = parseSerializedFixJob(job);
  const executionStarted = isExecutionStarted(parsedJob);

  const [loopDocs, setLoopDocs] = useState<SerializedLoopDocV0[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const parsedLoopDocs = useMemo(
    () => loopDocs.map(parseSerializedLoopDoc),
    [loopDocs]
  );

  const completedPhases = countCompletedPhases(parsedLoopDocs, parsedJob.entitlements);
  const allPhasesComplete = areAllPhasesComplete(parsedLoopDocs, parsedJob.entitlements);

  const visiblePhases = PHASE_ORDER.filter((phase) =>
    isPhaseApplicable(phase, parsedJob.entitlements)
  );

  const loadLoops = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}/loops`);
      const payload = await response.json();

      if (response.ok) {
        setLoopDocs((payload.data as SerializedLoopDocV0[]) ?? []);
      } else {
        setLoopDocs([]);
      }
    } catch {
      setLoopDocs([]);
    } finally {
      setIsLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    if (executionStarted) {
      void loadLoops();
    } else {
      setIsLoading(false);
    }
  }, [executionStarted, loadLoops]);

  function isTaskChecked(taskId: string): boolean {
    const merged = new Set<string>();
    for (const doc of parsedLoopDocs) {
      for (const id of doc.checkedTasks) {
        merged.add(id);
      }
    }
    return merged.has(taskId);
  }

  async function toggleTask(taskId: string, checked: boolean): Promise<void> {
    const loopKeys = getLoopKeysForTask(taskId, parsedJob.entitlements);
    if (loopKeys.length === 0) return;

    setIsSaving(true);
    try {
      const updatedDocs = [...loopDocs];

      for (const loopKey of loopKeys) {
        const response = await fetchWithAdminAuth(
          `/api/admin/fix-jobs/${job.id}/loops/${loopKey}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ taskId, checked }),
          }
        );

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to update task');
        }

        const updated = payload.data as SerializedLoopDocV0;
        const index = updatedDocs.findIndex((doc) => doc.loopKey === loopKey);
        if (index >= 0) {
          updatedDocs[index] = updated;
        } else {
          updatedDocs.push(updated);
        }
      }

      setLoopDocs(updatedDocs);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleContinueToQa(): Promise<void> {
    setIsSaving(true);
    try {
      const updated = await patchFixJob(job.id, { stage: 'QA' });
      onJobUpdated(updated);
      onContinueToQa();
    } finally {
      setIsSaving(false);
    }
  }

  if (!executionStarted) {
    return (
      <div className="mx-auto max-w-[900px] rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
        <p className="text-lg leading-[1.5] text-zinc-600">
          Start fix execution from the Triage tab to unlock this checklist.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[900px] pb-32">
        <header className="mb-8">
          <h2 className="text-2xl font-bold leading-[1.35] text-gray-950">Fix Execution</h2>
          <p className="mt-2 text-base leading-[1.5] text-zinc-600">
            Work through each active loop. All loops must reach &apos;Logged&apos; before QA
            unlocks.
          </p>
        </header>

        {isLoading ? (
          <p className="text-base text-zinc-600">Loading checklist…</p>
        ) : (
          <div className="space-y-10">
            {visiblePhases.map((phase) => (
              <section key={phase}>
                <h3 className="mb-4 text-lg font-semibold text-gray-950">
                  {PHASE_LABELS[phase]}
                </h3>
                <ul className="space-y-2">
                  {PHASE_TASKS[phase].map((task) => {
                    const checked = isTaskChecked(task.id);
                    const isExpanded = expandedTasks[task.id] ?? false;

                    return (
                      <li
                        key={task.id}
                        className="rounded-lg border border-gray-200 bg-white"
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <button
                            type="button"
                            aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
                            disabled={isSaving}
                            onClick={() => void toggleTask(task.id, !checked)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                              checked
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                            }`}
                          >
                            {checked && <Check className="h-4 w-4" aria-hidden="true" />}
                          </button>

                          <span
                            className={`flex-1 text-base leading-[1.5] ${
                              checked ? 'text-zinc-500 line-through' : 'text-gray-950'
                            }`}
                          >
                            {task.label}
                          </span>

                          <button
                            type="button"
                            aria-label="Toggle task details"
                            onClick={() =>
                              setExpandedTasks((prev) => ({
                                ...prev,
                                [task.id]: !isExpanded,
                              }))
                            }
                            className="shrink-0 rounded p-1 text-zinc-500 hover:bg-gray-100"
                          >
                            <ChevronDown
                              className={`h-5 w-5 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-5 shadow-[0_-1px_20px_rgba(85,85,85,0.1)] lg:px-10">
        <div className="mx-auto flex max-w-[1408px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-lg leading-[1.5] ${
              allPhasesComplete ? 'text-green-700' : 'text-[#545552]'
            }`}
          >
            Fix execution • {completedPhases} of 5 phases completed
          </p>

          <button
            type="button"
            disabled={!allPhasesComplete || isSaving}
            onClick={() => void handleContinueToQa()}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 px-6 py-2 text-base font-semibold uppercase ${
              allPhasesComplete
                ? 'border-[#1D4ED8] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                : 'cursor-not-allowed border-zinc-400 text-zinc-400'
            }`}
          >
            Continue to QA checklist
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  );
}
