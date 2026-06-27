'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

import { ExecutionStartModal } from '@/components/admin/ExecutionStartModal';
import { patchFixJob } from '@/lib/admin/patch-fix-job';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import { countTriageFieldsFilled } from '@/lib/fix-jobs/gates';
import { getPurchasedLoopsLabel } from '@/lib/fix-jobs/execution-logic';
import { parseSerializedFixJob, type SerializedFixJob } from '@/lib/fix-jobs/serialize';
import type { AdminClientListItem } from '@/lib/types/admin-linking';
import type { FixJobTriage } from '@/lib/types/fix-job';

type Props = {
  job: SerializedFixJob;
  onJobUpdated: (job: SerializedFixJob) => void;
  onExecutionStarted: () => void;
};

const TURNAROUND_OPTIONS = [
  '24 hours',
  '48 hours',
  '3–5 business days',
  '1 week',
  '2 weeks',
] as const;

const INPUT_CLASS =
  'min-h-[40px] w-full rounded-md border border-[rgba(111,121,122,0.4)] bg-white px-5 py-3 text-sm leading-[1.5] tracking-[-0.14px] text-gray-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2';

const EMAIL_SUBJECT = "We've started work on your website — here's what to expect";

type Complexity = NonNullable<FixJobTriage['complexity']>;

function buildDefaultTriage(existing: SerializedFixJob['triage']): FixJobTriage {
  return {
    clientGoal: existing?.clientGoal ?? null,
    complexity: existing?.complexity ?? null,
    expectedTurnaround: existing?.expectedTurnaround ?? '24 hours',
    internalNotes: existing?.internalNotes ?? null,
    overviewEmailSentAt: existing?.overviewEmailSentAt
      ? new Date(existing.overviewEmailSentAt)
      : null,
  };
}

function getClientFirstName(contactName: string | null | undefined): string {
  if (!contactName?.trim()) {
    return '[clientFirstName]';
  }

  return contactName.trim().split(/\s+/)[0] ?? '[clientFirstName]';
}

function buildEmailBody(params: {
  clientFirstName: string;
  purchasedLoops: string;
  clientGoal: string | null;
  expectedTurnaround: string | null;
}): string {
  const goal = params.clientGoal?.trim() || '[clientGoal]';
  const turnaround = params.expectedTurnaround?.trim() || '[expectedTurnaround]';

  return `Hi ${params.clientFirstName},

We've kicked off your website fix job and wanted to give you a quick overview of what we'll be working on.

What you purchased: ${params.purchasedLoops}
Your goal: ${goal}
Expected turnaround: ${turnaround}

We'll send you a full before/after report once everything is complete. In the meantime, feel free to reply to this email with any questions.

Talk soon,
Marcus
TradeSite Genie`;
}

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function TriageTab({ job, onJobUpdated, onExecutionStarted }: Props) {
  const parsedJob = parseSerializedFixJob(job);
  const [linkedClient, setLinkedClient] = useState<AdminClientListItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showExecutionModal, setShowExecutionModal] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isStartingExecution, setIsStartingExecution] = useState<boolean>(false);

  const triage = useMemo(() => buildDefaultTriage(job.triage), [job.triage]);
  const filledCount = countTriageFieldsFilled(parsedJob);
  const canContinue = filledCount === 3;

  const purchasedLoopsLabel = getPurchasedLoopsLabel(parsedJob.entitlements);
  const clientFirstName = getClientFirstName(linkedClient?.contactName);
  const recipientEmail = linkedClient?.email ?? '[client email]';

  const emailBody = buildEmailBody({
    clientFirstName,
    purchasedLoops: purchasedLoopsLabel,
    clientGoal: triage.clientGoal,
    expectedTurnaround: triage.expectedTurnaround,
  });

  useEffect(() => {
    if (!job.triage?.expectedTurnaround) {
      void saveTriage(buildDefaultTriage(job.triage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed default turnaround once
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadClient() {
      if (!job.linkedUserId) {
        setLinkedClient(null);
        return;
      }

      try {
        const response = await fetchWithAdminAuth('/api/admin/users');
        const payload = await response.json();
        if (!cancelled && response.ok) {
          const clients = payload.data as AdminClientListItem[];
          setLinkedClient(clients.find((item) => item.userId === job.linkedUserId) ?? null);
        }
      } catch {
        if (!cancelled) {
          setLinkedClient(null);
        }
      }
    }

    void loadClient();

    return () => {
      cancelled = true;
    };
  }, [job.linkedUserId]);

  async function saveTriage(nextTriage: FixJobTriage): Promise<void> {
    setIsSaving(true);
    try {
      const updated = await patchFixJob(job.id, {
        triage: {
          clientGoal: nextTriage.clientGoal,
          complexity: nextTriage.complexity,
          expectedTurnaround: nextTriage.expectedTurnaround,
          internalNotes: nextTriage.internalNotes,
          overviewEmailSentAt: nextTriage.overviewEmailSentAt
            ? nextTriage.overviewEmailSentAt.toISOString()
            : null,
        },
      });
      onJobUpdated(updated);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmExecutionStart(): Promise<void> {
    setIsStartingExecution(true);
    setExecutionError(null);

    try {
      const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}/approvals`, {
        method: 'POST',
        body: JSON.stringify({ gate: 'execution_start' }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to start execution');
      }

      if (payload.data) {
        onJobUpdated(payload.data as SerializedFixJob);
      }

      setShowExecutionModal(false);
      onExecutionStarted();
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : 'Failed to start execution');
    } finally {
      setIsStartingExecution(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[900px] pb-32">
        <header className="mb-8">
          <h2 className="text-2xl font-bold leading-[1.35] text-gray-950">Triage</h2>
          <p className="mt-2 text-base leading-[1.5] text-zinc-600">
            Assess the job before work begins and set client expectations.
          </p>
        </header>

        <div className="space-y-8">
          <section>
            <label htmlFor="client-goal" className="block text-base font-semibold text-gray-950">
              Client goal
            </label>
            <input
              id="client-goal"
              type="text"
              defaultValue={triage.clientGoal ?? ''}
              placeholder="What does the client want fixed or improved?"
              className={`${INPUT_CLASS} mt-2`}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value === (triage.clientGoal ?? '')) return;
                void saveTriage({ ...triage, clientGoal: value || null });
              }}
            />
            <p className="mt-2 text-xs leading-[1.5] tracking-[-0.12px] text-zinc-600">
              Summarize in plain language — this populates the overview email automatically.
            </p>
          </section>

          <section>
            <p className="text-base font-semibold text-gray-950">Complexity</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {(['Low', 'Medium', 'High'] as Complexity[]).map((level) => {
                const isSelected = triage.complexity === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      if (triage.complexity === level) return;
                      void saveTriage({ ...triage, complexity: level });
                    }}
                    className={`min-h-[40px] rounded-lg border-2 px-6 py-2 text-base font-semibold transition-colors ${
                      isSelected
                        ? 'border-[#1D4ED8] text-[#1D4ED8]'
                        : 'border-gray-300 text-zinc-600 hover:border-gray-400'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-[1.5] tracking-[-0.12px] text-zinc-600">
              How difficult is this job relative to others?
            </p>
          </section>

          <section>
            <label
              htmlFor="expected-turnaround"
              className="block text-base font-semibold text-gray-950"
            >
              Expected turnaround
            </label>
            <div className="relative mt-2">
              <select
                id="expected-turnaround"
                value={triage.expectedTurnaround ?? '24 hours'}
                onChange={(event) => {
                  void saveTriage({ ...triage, expectedTurnaround: event.target.value });
                }}
                className={`${INPUT_CLASS} appearance-none pr-10`}
              >
                {TURNAROUND_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-xs leading-[1.5] tracking-[-0.12px] text-zinc-600">
              Shown to the client in the overview email.
            </p>
          </section>

          <section>
            <label htmlFor="internal-notes" className="block text-base font-semibold text-gray-950">
              Internal notes
            </label>
            <textarea
              id="internal-notes"
              defaultValue={triage.internalNotes ?? ''}
              placeholder="Any technical details, access requirements, or context for this job..."
              className={`${INPUT_CLASS} mt-2 min-h-[120px] resize-y py-3`}
              onBlur={(event) => {
                const value = event.target.value;
                if (value === (triage.internalNotes ?? '')) return;
                void saveTriage({ ...triage, internalNotes: value || null });
              }}
            />
            <p className="mt-2 text-xs leading-[1.5] tracking-[-0.12px] text-zinc-600">
              Not shown to the client. Use this for cPanel notes, plugin conflicts, or anything
              useful for fix execution.
            </p>
          </section>

          <hr className="border-gray-300" />

          <section className="space-y-6">
            <h3 className="text-base font-semibold text-gray-950">Overview email</h3>

            <OverviewEmailField
              label="Recipient"
              value={recipientEmail}
              copyLabel="COPY EMAIL"
              onCopy={() => copyToClipboard(recipientEmail)}
            />

            <OverviewEmailField
              label="Subject line"
              value={EMAIL_SUBJECT}
              copyLabel="COPY SUBJECT"
              onCopy={() => copyToClipboard(EMAIL_SUBJECT)}
            />

            <OverviewEmailField
              label="Email body"
              value={emailBody}
              copyLabel="COPY BODY"
              onCopy={() => copyToClipboard(emailBody)}
              multiline
            />
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-5 shadow-[0_-1px_20px_rgba(85,85,85,0.1)] lg:px-10">
        <div className="mx-auto flex max-w-[1408px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg leading-[1.5] text-[#545552]">
            Triage incomplete • {filledCount} of 3 fields filled
          </p>

          <button
            type="button"
            disabled={!canContinue || isSaving}
            onClick={() => setShowExecutionModal(true)}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border-2 px-6 py-2 text-base font-semibold uppercase ${
              canContinue
                ? 'border-[#1D4ED8] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                : 'cursor-not-allowed border-zinc-400 text-zinc-400'
            }`}
          >
            Continue to fix execution
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </footer>

      <ExecutionStartModal
        isOpen={showExecutionModal}
        businessName={job.businessName}
        isSubmitting={isStartingExecution}
        error={executionError}
        onCancel={() => {
          setShowExecutionModal(false);
          setExecutionError(null);
        }}
        onConfirm={() => void handleConfirmExecutionStart()}
      />
    </>
  );
}

type OverviewEmailFieldProps = {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
  multiline?: boolean;
};

function OverviewEmailField({
  label,
  value,
  copyLabel,
  onCopy,
  multiline = false,
}: OverviewEmailFieldProps) {
  const [copied, setCopied] = useState<boolean>(false);

  async function handleCopy(): Promise<void> {
    await onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-950">{label}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div
          className={`flex-1 rounded-md border border-gray-200 bg-[#FAF9F5] px-4 py-3 text-sm leading-[1.5] text-gray-950 ${
            multiline ? 'whitespace-pre-wrap' : ''
          }`}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg border-2 border-[#1D4ED8] px-4 py-2 text-sm font-semibold uppercase text-[#1D4ED8] hover:bg-blue-50"
        >
          {copied ? 'Copied!' : copyLabel}
        </button>
      </div>
    </div>
  );
}
