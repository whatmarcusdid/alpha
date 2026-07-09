'use client';

import { useMemo, useState } from 'react';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  findDeniedToolName,
  formatComposerTimestamp,
  isCharacterCounterWarning,
} from '@/lib/fix-jobs/fix-update-utils';
import { PILLAR_TITLES } from '@/lib/fix-jobs/job-detail-utils';
import {
  buildDeliveryConfirmMessage,
  validateLoomUrl,
} from '@/lib/fix-jobs/report-delivery-ui';
import type { FixJobDetailPayload } from '@/lib/types/fix-session';
import type { FixPillar } from '@/lib/audit/fixPlaybook';

const MAX_DELIVERY_NOTE = 500;

export function ReportModule({
  detail,
  uid,
  sessionId,
  onReportGenerated,
  onDelivered,
}: {
  detail: FixJobDetailPayload;
  uid: string;
  sessionId: string;
  onReportGenerated: (reportData: NonNullable<FixJobDetailPayload['reportData']>) => void;
  onDelivered: (data: {
    sentAt: string;
    loomUrl: string | null;
    reportUrl: string;
  }) => void;
}) {
  const [deliveryNote, setDeliveryNote] = useState(
    detail.reportData?.deliveryNote ?? ''
  );
  const [loomUrl, setLoomUrl] = useState(detail.reportData?.loomUrl ?? '');
  const [loomError, setLoomError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliverError, setDeliverError] = useState<string | null>(null);

  const reportData = detail.reportData;
  const isSent = reportData?.status === 'sent';
  const isGenerated =
    reportData?.status === 'generated' || reportData?.status === 'sent';
  const canGenerate =
    (detail.stage === 'report_ready' || detail.stage === 'delivered') && !isSent;
  const canDeliver =
    detail.stage === 'report_ready' &&
    reportData?.status === 'generated' &&
    Boolean(reportData.reportId);

  const deniedTerm = useMemo(
    () => findDeniedToolName(deliveryNote),
    [deliveryNote]
  );

  const qaOverrideNotes = reportData?.qaOverrideNotes ?? {};
  const recipientEmail = detail.customerEmail;

  const confirmMessage = useMemo(() => {
    if (!reportData?.generatedAt) {
      return '';
    }

    return buildDeliveryConfirmMessage({
      recipientEmail,
      generatedAtLabel: formatComposerTimestamp(new Date(reportData.generatedAt)),
      loomUrl,
    });
  }, [loomUrl, recipientEmail, reportData?.generatedAt]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/report/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            ...(deliveryNote.trim() ? { deliveryNote: deliveryNote.trim() } : {}),
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to generate report');
      }

      const generatedAt = new Date().toISOString();
      onReportGenerated({
        status: 'generated',
        reportId: payload.data.reportId as string,
        generatedAt,
        sentAt: reportData?.sentAt ?? null,
        deliveryNote: deliveryNote.trim() || null,
        qaOverrideNotes,
        reportUrl: reportData?.reportUrl ?? null,
        loomUrl: reportData?.loomUrl ?? null,
        deliveryStatus: reportData?.deliveryStatus ?? null,
      });
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'Failed to generate report'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLoomBlur() {
    setLoomError(validateLoomUrl(loomUrl));
  }

  function handleLoomFocus() {
    setLoomError(null);
  }

  async function handleDeliver() {
    setDeliverLoading(true);
    setDeliverError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/deliver`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            ...(loomUrl.trim() ? { loomUrl: loomUrl.trim() } : {}),
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to send delivery');
      }

      setConfirmOpen(false);
      onDelivered({
        sentAt: payload.data.sentAt as string,
        loomUrl: loomUrl.trim() || null,
        reportUrl: `/api/dashboard/report-download?sessionId=${sessionId}`,
      });
    } catch (deliverFailure) {
      setDeliverError(
        deliverFailure instanceof Error
          ? deliverFailure.message
          : 'Failed to send delivery'
      );
    } finally {
      setDeliverLoading(false);
    }
  }

  if (detail.stage !== 'report_ready' && detail.stage !== 'delivered') {
    return null;
  }

  const previewUrl = `/api/admin/fix-jobs/${sessionId}/report/download?uid=${encodeURIComponent(uid)}`;
  const customerDownloadUrl =
    detail.reportData?.reportUrl ??
    `/api/dashboard/report-download?sessionId=${sessionId}`;
  const deliveredLoomUrl = (detail.reportData?.loomUrl ?? loomUrl.trim()) || null;

  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAF9F5] p-4">
      <h2 className="text-xl font-semibold text-gray-950">Report</h2>

      {Object.keys(qaOverrideNotes).length > 0 && canGenerate && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">⚠ Internal notes to consider</p>
          <ul className="mt-2 space-y-1">
            {(Object.entries(qaOverrideNotes) as [FixPillar, string][]).map(
              ([pillar, note]) => (
                <li key={pillar}>
                  {PILLAR_TITLES[pillar]}: &ldquo;{note}&rdquo;
                </li>
              )
            )}
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            These are for your reference only — don&apos;t paste into the delivery note.
          </p>
        </div>
      )}

      {canGenerate ? (
        <>
          <label className="mt-4 block text-sm font-medium text-gray-950">
            Delivery note (optional — shown to customer in report)
          </label>
          <textarea
            value={deliveryNote}
            onChange={(event) => setDeliveryNote(event.target.value)}
            maxLength={MAX_DELIVERY_NOTE}
            placeholder="Add anything the customer should know, e.g. blacklist delisting timeline..."
            className="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p
            className={`mt-1 text-xs ${
              isCharacterCounterWarning(deliveryNote.length) ||
              deliveryNote.length > MAX_DELIVERY_NOTE
                ? 'text-amber-700'
                : 'text-zinc-500'
            }`}
          >
            {deliveryNote.length} / {MAX_DELIVERY_NOTE}
          </p>
          {deniedTerm && (
            <p className="mt-1 text-sm text-red-700">
              Delivery note contains a technical tool name — rewrite in plain language
              (found: &ldquo;{deniedTerm}&rdquo;)
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                loading ||
                deliveryNote.length > MAX_DELIVERY_NOTE ||
                Boolean(deniedTerm)
              }
              onClick={() => void handleGenerate()}
              className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Generating…'
                : isGenerated
                  ? 'Regenerate report'
                  : 'Generate report'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-gray-800">
          {reportData?.deliveryNote && (
            <p>
              <span className="font-medium">Delivery note:</span>{' '}
              {reportData.deliveryNote}
            </p>
          )}
        </div>
      )}

      {isGenerated && reportData?.generatedAt && !isSent && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            Generated
          </span>
          <span className="text-zinc-600">
            {formatComposerTimestamp(new Date(reportData.generatedAt))}
          </span>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            Preview PDF
          </a>
        </div>
      )}

      {canDeliver && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-950">
            Loom walkthrough URL (optional)
          </label>
          <input
            type="url"
            value={loomUrl}
            onChange={(event) => setLoomUrl(event.target.value)}
            onBlur={handleLoomBlur}
            onFocus={handleLoomFocus}
            placeholder="https://loom.com/share/..."
            className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {loomError && <p className="mt-1 text-sm text-red-700">{loomError}</p>}

          <p className="mt-3 text-sm text-zinc-600">
            Will be sent to:{' '}
            <span className="font-medium text-gray-950">{recipientEmail}</span>
          </p>

          <button
            type="button"
            disabled={deliverLoading || Boolean(loomError) || confirmOpen}
            onClick={() => setConfirmOpen(true)}
            className="mt-4 min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send final delivery
          </button>

          {confirmOpen && (
            <div className="mt-3 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
              <p className="whitespace-pre-line text-sm text-gray-950">{confirmMessage}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={deliverLoading}
                  className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deliverLoading}
                  onClick={() => void handleDeliver()}
                  className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deliverLoading ? 'Sending…' : 'Send delivery'}
                </button>
              </div>
            </div>
          )}

          {deliverError && <p className="mt-2 text-sm text-red-700">{deliverError}</p>}
        </div>
      )}

      {isSent && reportData?.sentAt && (
        <div className="mt-6 border-t border-gray-200 pt-4 text-sm text-gray-800">
          <p className="font-medium text-emerald-800">
            ✓ Delivered to {recipientEmail} ·{' '}
            {formatComposerTimestamp(new Date(reportData.sentAt))}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={customerDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 hover:text-blue-800"
            >
              Download report
            </a>
            {deliveredLoomUrl && (
              <a
                href={deliveredLoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-700 hover:text-blue-800"
              >
                View Loom
              </a>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
