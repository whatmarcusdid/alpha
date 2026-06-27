'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, FileText } from 'lucide-react';

import { CompleteJobModal } from '@/components/admin/CompleteJobModal';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  areAllDeliveryStepsComplete,
  buildDeliveryEmailBody,
  buildReportFilename,
  countDeliverySteps,
  formatFileSize,
} from '@/lib/fix-jobs/delivery-helpers';
import { getPurchasedLoopsLabel } from '@/lib/fix-jobs/execution-logic';
import { parseSerializedFixJob, type SerializedFixJob } from '@/lib/fix-jobs/serialize';
import { parseSerializedQADoc, type SerializedQADoc } from '@/lib/fix-jobs/serialize-loop';
import type { AdminClientListItem } from '@/lib/types/admin-linking';
import type { CredentialDisplayRow, CredentialType } from '@/lib/types/delivery';

type Props = {
  job: SerializedFixJob;
  onJobUpdated: (job: SerializedFixJob) => void;
};

const EMAIL_SUBJECT = 'Your website fix is complete — here\'s your full report';

type DeliveryState = {
  credentials: CredentialDisplayRow[];
  reportMeta: { filename: string; fileSizeBytes: number } | null;
};

function formatGeneratedDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function formatSentDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `Sent ${datePart} · ${timePart}`;
}

function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function getClientFirstName(contactName: string | null | undefined): string {
  if (!contactName?.trim()) {
    return '[clientFirstName]';
  }

  return contactName.trim().split(/\s+/)[0] ?? '[clientFirstName]';
}

function getFirstFlagNote(qaDoc: SerializedQADoc | null): string | null {
  if (!qaDoc) {
    return null;
  }

  for (const item of Object.values(qaDoc.items)) {
    if (item.result === 'flag' && item.flagNote?.trim()) {
      return item.flagNote.trim();
    }
  }

  return null;
}

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function DeliveryTab({ job, onJobUpdated }: Props) {
  const router = useRouter();
  const parsedJob = parseSerializedFixJob(job);

  const [deliveryState, setDeliveryState] = useState<DeliveryState>({
    credentials: [],
    reportMeta: null,
  });
  const [linkedClient, setLinkedClient] = useState<AdminClientListItem | null>(null);
  const [qaDoc, setQaDoc] = useState<SerializedQADoc | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isMarkingSent, setIsMarkingSent] = useState<boolean>(false);
  const [revokingType, setRevokingType] = useState<CredentialType | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const reportGenerated =
    job.report?.status === 'generated' || job.report?.status === 'sent';
  const emailSent = job.delivery?.status === 'sent';

  const revokedTypes = useMemo(
    () =>
      new Set(
        deliveryState.credentials
          .filter((row) => row.revokedAt)
          .map((row) => row.credentialType)
      ),
    [deliveryState.credentials]
  );

  const completedSteps = countDeliverySteps({
    reportStatus: job.report?.status,
    deliveryStatus: job.delivery?.status,
    revokedTypes,
  });

  const allStepsComplete = areAllDeliveryStepsComplete({
    reportStatus: job.report?.status,
    deliveryStatus: job.delivery?.status,
    revokedTypes,
  });

  const allAccessRevoked = revokedTypes.size === 3;

  const reportFilename =
    deliveryState.reportMeta?.filename ??
    buildReportFilename(job.displayId, job.businessName);

  const purchasedLoopsLabel = getPurchasedLoopsLabel(parsedJob.entitlements);
  const clientFirstName = getClientFirstName(linkedClient?.contactName);
  const recipientEmail = linkedClient?.email ?? '[client email]';

  const emailBody = buildDeliveryEmailBody({
    clientFirstName,
    purchasedLoopsLabel,
    primaryWebsiteUrl: job.primaryWebsiteUrl,
    entitlements: parsedJob.entitlements,
    flagNote: getFirstFlagNote(qaDoc),
  });

  const loadDeliveryState = useCallback(async () => {
    const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}/delivery`);
    const payload = await response.json();

    if (response.ok) {
      const data = payload.data as {
        job: SerializedFixJob;
        credentials: CredentialDisplayRow[];
        reportMeta: { filename: string; fileSizeBytes: number } | null;
      };

      onJobUpdated(data.job);
      setDeliveryState({
        credentials: data.credentials,
        reportMeta: data.reportMeta,
      });
    }
  }, [job.id, onJobUpdated]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        await loadDeliveryState();

        if (job.linkedUserId) {
          const usersResponse = await fetchWithAdminAuth('/api/admin/users');
          const usersPayload = await usersResponse.json();
          if (!cancelled && usersResponse.ok) {
            const clients = usersPayload.data as AdminClientListItem[];
            setLinkedClient(
              clients.find((item) => item.userId === job.linkedUserId) ?? null
            );
          }
        }

        const qaResponse = await fetchWithAdminAuth(`/api/admin/fix-jobs/${job.id}/qa`);
        const qaPayload = await qaResponse.json();
        if (!cancelled && qaResponse.ok) {
          setQaDoc(qaPayload.data as SerializedQADoc);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [job.id, job.linkedUserId, loadDeliveryState]);

  async function handleGenerateReport(): Promise<void> {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetchWithAdminAuth('/api/admin/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ fixJobId: job.id }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to generate report');
      }

      await loadDeliveryState();
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleMarkSent(): Promise<void> {
    setIsMarkingSent(true);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${job.id}/delivery/mark-sent`,
        { method: 'POST' }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to mark email as sent');
      }

      if (payload.data) {
        onJobUpdated(payload.data as SerializedFixJob);
      }

      await loadDeliveryState();
    } finally {
      setIsMarkingSent(false);
    }
  }

  async function handleRevoke(credentialType: CredentialType): Promise<void> {
    setRevokingType(credentialType);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${job.id}/delivery/revoke-access`,
        {
          method: 'PATCH',
          body: JSON.stringify({ credentialType }),
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to revoke access');
      }

      await loadDeliveryState();
    } finally {
      setRevokingType(null);
    }
  }

  async function handleCompleteJob(): Promise<void> {
    setIsCompleting(true);
    setCompleteError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${job.id}/delivery/complete`,
        { method: 'POST' }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to complete job');
      }

      setShowCompleteModal(false);
      router.push('/admin/fix-jobs');
    } catch (error) {
      setCompleteError(error instanceof Error ? error.message : 'Failed to complete job');
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] py-8">
        <p className="text-base text-zinc-600">Loading delivery…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[900px] pb-32">
        <header className="mb-8">
          <h2 className="text-2xl font-bold leading-[1.35] text-gray-950">Delivery</h2>
          <p className="mt-2 text-base leading-[1.5] text-zinc-600">
            Three steps — review the report, send the delivery email, revoke site access.
            Then mark the job complete.
          </p>
        </header>

        <div className="space-y-12">
          {/* Section 1 — Review report */}
          <section>
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-950">Review report</h3>
              {!reportGenerated && (
                <button
                  type="button"
                  onClick={() => void handleGenerateReport()}
                  disabled={isGenerating}
                  className="text-base font-semibold text-[#1D4ED8] hover:underline disabled:opacity-50"
                >
                  {isGenerating ? 'Generating…' : 'Generate report'}
                </button>
              )}
            </div>

            <p className="text-base leading-[1.5] text-zinc-600">
              The report pulls from your Phase 4 before/after summaries and logged metrics.
              Review it below, then generate the PDF to attach to the delivery email.
            </p>

            {generateError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {generateError}
              </p>
            )}

            {reportGenerated && job.report?.generatedAt && (
              <>
                <p className="mt-4 text-sm font-semibold text-green-700">
                  Generated on {formatGeneratedDate(job.report.generatedAt)}
                </p>

                <div className="mt-3 flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <FileText className="h-8 w-8 shrink-0 text-zinc-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-gray-950">
                      {reportFilename}
                    </p>
                    {deliveryState.reportMeta?.fileSizeBytes ? (
                      <p className="text-sm text-zinc-600">
                        {formatFileSize(deliveryState.reportMeta.fileSizeBytes)}
                      </p>
                    ) : null}
                  </div>
                  {job.report.previewUrl && (
                    <>
                      <a
                        href={job.report.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-gray-300 text-zinc-600 hover:bg-gray-50"
                        aria-label="Preview report"
                      >
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      </a>
                      <a
                        href={job.report.previewUrl}
                        download={reportFilename}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-gray-300 text-zinc-600 hover:bg-gray-50"
                        aria-label="Download report"
                      >
                        <Download className="h-5 w-5" aria-hidden="true" />
                      </a>
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Section 2 — Send delivery email */}
          <section>
            <div className="mb-3 flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-950">
                Send delivery email to client
              </h3>
              {reportGenerated && !emailSent && (
                <button
                  type="button"
                  onClick={() => void handleMarkSent()}
                  disabled={isMarkingSent}
                  className="text-base font-semibold text-[#1D4ED8] hover:underline disabled:opacity-50"
                >
                  {isMarkingSent ? 'Saving…' : 'Mark as sent'}
                </button>
              )}
            </div>

            {emailSent && job.delivery?.sentAt ? (
              <p className="mb-4 text-sm font-semibold text-green-700">
                {formatSentDateTime(job.delivery.sentAt)}
              </p>
            ) : (
              <p className="mb-4 text-base leading-[1.5] text-zinc-600">
                Copy each field into your email client. Attach the generated PDF report. Mark
                as sent once delivered.
              </p>
            )}

            <div className="space-y-6">
              <CopyField
                label="Recipient"
                value={recipientEmail}
                copyLabel="COPY EMAIL"
              />
              <CopyField label="Subject line" value={EMAIL_SUBJECT} copyLabel="COPY SUBJECT" />
              <CopyField
                label="Email body"
                value={emailBody}
                copyLabel="COPY BODY"
                multiline
              />
            </div>
          </section>

          {/* Section 3 — Revoke site access */}
          <section>
            <h3 className="mb-3 text-lg font-semibold text-gray-950">Revoke site access</h3>

            {allAccessRevoked ? (
              <p className="mb-4 text-sm font-semibold text-green-700">All access revoked</p>
            ) : (
              <p className="mb-4 text-base leading-[1.5] text-zinc-600">
                Now that work is complete, revoke any temporary access that was granted. The
                client can always grant access again for a future job.
              </p>
            )}

            <div className="rounded-lg bg-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-950">Active access to revoke</p>
              <p className="mt-1 text-sm text-zinc-600">
                Revoke all temporary credentials granted during this fix job.
              </p>

              <ul className="mt-4 space-y-3">
                {deliveryState.credentials.map((row) => {
                  const isRevoked = Boolean(row.revokedAt);

                  return (
                    <li
                      key={row.credentialType}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-base font-semibold text-gray-950">{row.label}</p>
                        {isRevoked && row.revokedAt ? (
                          <p className="text-sm text-zinc-500">
                            revoke on {formatShortDate(row.revokedAt)}
                          </p>
                        ) : row.expiresAt ? (
                          <p className="text-sm text-zinc-500">
                            expires {formatShortDate(row.expiresAt)}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        {isRevoked ? (
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold uppercase text-zinc-600">
                            Revoked
                          </span>
                        ) : (
                          <>
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase text-green-800">
                              Granted
                            </span>
                            <button
                              type="button"
                              disabled={revokingType === row.credentialType}
                              onClick={() => void handleRevoke(row.credentialType)}
                              className="min-h-[40px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold uppercase text-zinc-600 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {revokingType === row.credentialType ? 'Revoking…' : 'Revoke ×'}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-5 shadow-[0_-1px_20px_rgba(85,85,85,0.1)] lg:px-10">
        <div className="mx-auto flex max-w-[1408px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-lg leading-[1.5] ${
              allStepsComplete ? 'text-green-700' : 'text-[#545552]'
            }`}
          >
            Delivery in progress • {completedSteps} of 5 steps completed
          </p>

          <button
            type="button"
            disabled={!allStepsComplete || isCompleting}
            onClick={() => setShowCompleteModal(true)}
            className={`inline-flex min-h-[40px] items-center justify-center rounded-lg border-2 px-6 py-2 text-base font-semibold uppercase ${
              allStepsComplete
                ? 'border-[#1D4ED8] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                : 'cursor-not-allowed border-zinc-400 text-zinc-400'
            }`}
          >
            Mark job fix as complete
          </button>
        </div>
      </footer>

      <CompleteJobModal
        isOpen={showCompleteModal}
        businessName={job.businessName}
        isSubmitting={isCompleting}
        error={completeError}
        onCancel={() => {
          setShowCompleteModal(false);
          setCompleteError(null);
        }}
        onConfirm={() => void handleCompleteJob()}
      />
    </>
  );
}

type CopyFieldProps = {
  label: string;
  value: string;
  copyLabel: string;
  multiline?: boolean;
};

function CopyField({ label, value, copyLabel, multiline = false }: CopyFieldProps) {
  const [copied, setCopied] = useState<boolean>(false);

  async function handleCopy(): Promise<void> {
    await copyToClipboard(value);
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
