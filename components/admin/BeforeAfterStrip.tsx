'use client';

import { useEffect, useMemo, useState } from 'react';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  countBaselineSignals,
  countResolvedSignals,
  diffAuditSnapshots,
  type PillarDiff,
} from '@/lib/audit/diffAuditSnapshots';
import { formatComposerTimestamp } from '@/lib/fix-jobs/fix-update-utils';
import { gradeBadgeClass } from '@/lib/fix-jobs/job-detail-utils';
import type { AuditLeadDoc } from '@/lib/types/audit';
import { SECURITY_FLAG_DISPLAY_NAMES } from '@/lib/types/audit';
import type { FixJobStage, FixJobDetailPayload } from '@/lib/types/fix-session';
import type { FixPillar } from '@/lib/audit/fixPlaybook';
import { SPEED_ISSUE_DISPLAY_NAMES } from '@/lib/audit/speedTopIssues';
import { SEO_SIGNAL_DISPLAY_NAMES } from '@/lib/types/seoSignals';

function signalDisplayName(
  pillar: 'speed' | 'security' | 'seo',
  signalKey: string
): string {
  if (pillar === 'speed') {
    return (
      SPEED_ISSUE_DISPLAY_NAMES[
        signalKey as keyof typeof SPEED_ISSUE_DISPLAY_NAMES
      ] ?? signalKey
    );
  }

  if (pillar === 'security') {
    return (
      SECURITY_FLAG_DISPLAY_NAMES[
        signalKey as keyof typeof SECURITY_FLAG_DISPLAY_NAMES
      ] ?? signalKey
    );
  }

  return SEO_SIGNAL_DISPLAY_NAMES[signalKey as keyof typeof SEO_SIGNAL_DISPLAY_NAMES] ?? signalKey;
}

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'] as const;

function arrowClass(diff: PillarDiff | undefined): string {
  if (!diff || diff.status === 'failed') {
    return 'text-gray-400';
  }

  if (diff.improved) {
    return 'text-green-700';
  }

  if (
    GRADE_ORDER.indexOf(diff.gradeAfter as (typeof GRADE_ORDER)[number]) >
    GRADE_ORDER.indexOf(diff.gradeBefore as (typeof GRADE_ORDER)[number])
  ) {
    return 'text-red-700';
  }

  return 'text-gray-400';
}

export function BeforeAfterStrip({
  pillarKey,
  pillar,
  baseline,
  detail,
}: {
  pillarKey: 'speed' | 'security' | 'seo';
  pillar: FixPillar;
  baseline: FixJobDetailPayload['baseline'];
  detail: FixJobDetailPayload;
}) {
  const [expanded, setExpanded] = useState(false);

  const afterPillar =
    pillarKey === 'speed'
      ? detail.afterAudit?.speed
      : pillarKey === 'security'
        ? detail.afterAudit?.security
        : detail.afterAudit?.seo;

  const auditLeadBaseline = useMemo(
    (): AuditLeadDoc =>
      ({
        auditLeadId: detail.auditLeadId,
        speedGrade: baseline.speedGrade,
        speedTopIssues: baseline.speedTopIssues,
        securityGrade: baseline.securityGrade,
        securityFlags: baseline.securityFlags,
        seoGrade: baseline.seoGrade,
        seoFailingSignals: baseline.seoFailingSignals,
      }) as AuditLeadDoc,
    [baseline, detail.auditLeadId]
  );

  if (!afterPillar) {
    return null;
  }

  const afterSnapshot = detail.afterAudit;
  if (!afterSnapshot) {
    return null;
  }

  const diff = diffAuditSnapshots(auditLeadBaseline, afterSnapshot, [pillar])[
    pillarKey
  ];

  if (diff?.status === 'failed') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-zinc-600">
        Check couldn&apos;t complete — try again
      </div>
    );
  }

  const resolvedCount = countResolvedSignals(diff);
  const baselineCount = countBaselineSignals(auditLeadBaseline, detail.entitlements, pillarKey);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeBadgeClass(diff?.gradeBefore ?? 'F')}`}
        >
          {diff?.gradeBefore}
        </span>
        <span className={arrowClass(diff)}>→</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeBadgeClass(diff?.gradeAfter ?? 'N/A')}`}
        >
          {diff?.gradeAfter}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-sm text-blue-700 hover:text-blue-800"
        >
          {resolvedCount} of {baselineCount} signals resolved
        </button>
      </div>

      {expanded && diff && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          {diff.resolved.length > 0 && (
            <p className="text-green-800">
              Resolved:{' '}
              {diff.resolved.map((key) => signalDisplayName(pillarKey, key)).join(', ')}
            </p>
          )}
          {diff.remaining.length > 0 && (
            <p className="mt-1 text-amber-800">
              Remaining:{' '}
              {diff.remaining.map((key) => signalDisplayName(pillarKey, key)).join(', ')}
            </p>
          )}
          {diff.introduced.length > 0 && (
            <p className="mt-1 text-red-800">
              Introduced:{' '}
              {diff.introduced.map((key) => signalDisplayName(pillarKey, key)).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RerunChecksButton({
  sessionId,
  uid,
  stage,
  afterAuditCapturedAt,
  openRequestNonce,
  onAfterAudit,
}: {
  sessionId: string;
  uid: string;
  stage: FixJobStage;
  afterAuditCapturedAt: string | null;
  openRequestNonce?: number;
  onAfterAudit: (afterAudit: NonNullable<FixJobDetailPayload['afterAudit']>) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(
    afterAuditCapturedAt
  );

  useEffect(() => {
    if (openRequestNonce && openRequestNonce > 0) {
      setConfirmOpen(true);
    }
  }, [openRequestNonce]);

  const enabled = stage === 'in_progress' || stage === 'qa';
  const tooltip =
    stage === 'delivered'
      ? 'Job delivered'
      : !enabled
        ? 'Start work first'
        : undefined;

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/rerun-checks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Check failed — try again.');
      }

      const afterAudit = payload.data.afterAudit as NonNullable<
        FixJobDetailPayload['afterAudit']
      >;
      onAfterAudit(afterAudit);
      setLastCheckedAt(afterAudit.capturedAt);
      setConfirmOpen(false);
    } catch (rerunError) {
      setError(
        rerunError instanceof Error ? rerunError.message : 'Check failed — try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={!enabled || loading}
        title={tooltip}
        onClick={() => setConfirmOpen(true)}
        className="min-h-[40px] rounded-full border-2 border-[#1B4A41] px-4 py-2 text-sm font-semibold text-[#1B4A41] hover:bg-[#1B4A41]/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1B4A41] border-t-transparent"
              aria-hidden
            />
            Running checks — about a minute…
          </span>
        ) : (
          'Re-run checks'
        )}
      </button>

      {lastCheckedAt && (
        <p className="mt-1 text-xs text-zinc-500">
          Last checked {formatComposerTimestamp(new Date(lastCheckedAt))}
        </p>
      )}

      {confirmOpen && !loading && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-950">
            This will re-scan the site. Scans take about a minute and won&apos;t
            interrupt your work.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521]"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
