'use client';

import { useMemo, useState } from 'react';

import { diffAuditSnapshots } from '@/lib/audit/diffAuditSnapshots';
import { QA_CHECKLISTS } from '@/lib/audit/qaChecklists';
import type { EvalResult } from '@/lib/audit/qaEvaluators';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import { PILLAR_TITLES } from '@/lib/fix-jobs/job-detail-utils';
import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixJobDetailPayload, FixJobStage } from '@/lib/types/fix-session';

function pillarStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'passed':
      return 'Passed ✓';
    case 'failed':
      return 'Failed ✗';
    case 'in_progress':
      return 'In progress';
    default:
      return 'Not started';
  }
}

function autoItemDetail(
  itemId: string,
  result: EvalResult,
  pillar: FixPillar,
  diff: ReturnType<typeof diffAuditSnapshots> | null
): string | null {
  if (result !== 'fail') {
    return null;
  }

  const pillarDiff =
    pillar === 'speed'
      ? diff?.speed
      : pillar === 'security'
        ? diff?.security
        : diff?.seo;

  if (itemId === 'signals_resolved' || itemId === 'flags_resolved') {
    const count = pillarDiff?.remaining.length ?? 0;
    return `${count} signal${count === 1 ? '' : 's'} remaining`;
  }

  if (itemId === 'grade_improved' && pillarDiff) {
    return `${pillarDiff.gradeBefore} → ${pillarDiff.gradeAfter}`;
  }

  if (itemId === 'snapshot_fresh') {
    return 'Re-run checks after completing signals';
  }

  if (itemId === 'no_tier1_flags') {
    return 'Tier 1 flags still present';
  }

  return null;
}

function AutoItemRow({
  label,
  result,
  detail,
  onRerunChecks,
  readOnly,
}: {
  label: string;
  result: EvalResult;
  detail: string | null;
  onRerunChecks?: () => void;
  readOnly: boolean;
}) {
  if (result === 'pass') {
    return (
      <li className="flex items-start gap-2 text-sm text-green-800">
        <span aria-hidden>✓</span>
        <span>{label}</span>
      </li>
    );
  }

  if (result === 'fail') {
    return (
      <li className="flex items-start gap-2 text-sm text-red-800">
        <span aria-hidden>✗</span>
        <span>
          {label}
          {detail ? ` (${detail})` : ''}
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start gap-2 text-sm text-zinc-600">
      <span aria-hidden>—</span>
      <span>{label}</span>
      {!readOnly && onRerunChecks && (
        <button
          type="button"
          onClick={onRerunChecks}
          className="text-blue-700 hover:text-blue-800"
        >
          Re-run checks
        </button>
      )}
    </li>
  );
}

function PillarQABlock({
  pillar,
  detail,
  readOnly,
  onQaUpdate,
  onManualCheckChange,
  onRerunChecks,
}: {
  pillar: FixPillar;
  detail: FixJobDetailPayload;
  readOnly: boolean;
  onQaUpdate: (perPillar: Record<string, string>) => void;
  onManualCheckChange?: (
    pillar: FixPillar,
    itemId: string,
    checked: boolean
  ) => void;
  onRerunChecks?: () => void;
}) {
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [failNote, setFailNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qaData = detail.qaData;
  const autoEvals = qaData?.autoEvals?.[pillar] ?? {};
  const manualChecks = qaData?.manualChecks?.[pillar] ?? {};
  const pillarStatus = qaData?.perPillar?.[pillar] ?? 'not_started';

  const auditLeadBaseline = useMemo(
    (): AuditLeadDoc =>
      ({
        auditLeadId: detail.auditLeadId,
        speedGrade: detail.baseline.speedGrade,
        speedTopIssues: detail.baseline.speedTopIssues,
        securityGrade: detail.baseline.securityGrade,
        securityFlags: detail.baseline.securityFlags,
        seoGrade: detail.baseline.seoGrade,
        seoFailingSignals: detail.baseline.seoFailingSignals,
      }) as AuditLeadDoc,
    [detail]
  );

  const diff = useMemo(() => {
    if (!detail.afterAudit) {
      return null;
    }

    return diffAuditSnapshots(
      auditLeadBaseline,
      detail.afterAudit,
      detail.entitlements
    );
  }, [auditLeadBaseline, detail.afterAudit, detail.entitlements]);

  const manualItems = QA_CHECKLISTS[pillar].filter((item) => item.kind === 'manual');
  const allManualChecked = manualItems.every((item) => manualChecks[item.id]?.checked);

  const hasRedOrGray = QA_CHECKLISTS[pillar]
    .filter((item) => item.kind === 'auto')
    .some((item) => {
      const result = autoEvals[item.id];
      return result === 'fail' || result === 'unavailable';
    });

  async function patchQa(body: Record<string, unknown>) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${detail.sessionId}/qa`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: detail.uid, ...body }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update QA');
      }

      onQaUpdate(payload.data.perPillar as Record<string, string>);
      setPassDialogOpen(false);
      setFailDialogOpen(false);
      setOverrideNote('');
      setFailNote('');
    } catch (qaError) {
      setError(qaError instanceof Error ? qaError.message : 'Failed to update QA');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualToggle(itemId: string, checked: boolean) {
    onManualCheckChange?.(pillar, itemId, checked);
    await patchQa({
      type: 'set_manual_check',
      pillar,
      itemId,
      checked,
    });
  }

  async function handlePassConfirm() {
    await patchQa({
      type: 'decide',
      pillar,
      status: 'passed',
      ...(hasRedOrGray ? { note: overrideNote.trim() } : {}),
    });
  }

  async function handleFailConfirm() {
    await patchQa({
      type: 'decide',
      pillar,
      status: 'failed',
      note: failNote.trim(),
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAF9F5] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-950">
          {PILLAR_TITLES[pillar]} — QA
        </h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {pillarStatusLabel(pillarStatus)}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Evidence
          </p>
          <ul className="mt-2 space-y-1">
            {QA_CHECKLISTS[pillar]
              .filter((item) => item.kind === 'auto')
              .map((item) => (
                <AutoItemRow
                  key={item.id}
                  label={item.label}
                  result={autoEvals[item.id] ?? 'unavailable'}
                  detail={autoItemDetail(
                    item.id,
                    autoEvals[item.id] ?? 'unavailable',
                    pillar,
                    diff
                  )}
                  onRerunChecks={onRerunChecks}
                  readOnly={readOnly}
                />
              ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Confirmations
          </p>
          <ul className="mt-2 space-y-2">
            {manualItems.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-2 text-sm text-gray-950">
                  <input
                    type="checkbox"
                    className="mt-1 min-h-[16px] min-w-[16px]"
                    checked={manualChecks[item.id]?.checked ?? false}
                    disabled={readOnly || loading}
                    onChange={(event) =>
                      void handleManualToggle(item.id, event.target.checked)
                    }
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!allManualChecked || loading}
              title={
                !allManualChecked ? 'Check all confirmations first' : undefined
              }
              onClick={() => setPassDialogOpen(true)}
              className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pass
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setFailDialogOpen(true)}
              className="min-h-[40px] rounded-full border-2 border-[#1B4A41] px-4 py-2 text-sm font-semibold text-[#1B4A41]"
            >
              Fail
            </button>
          </div>
        )}

        {passDialogOpen && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            {hasRedOrGray ? (
              <>
                <p className="text-sm text-gray-950">
                  One or more auto-checks are red or unavailable. Add an override
                  note to pass anyway.
                </p>
                <textarea
                  value={overrideNote}
                  onChange={(event) => setOverrideNote(event.target.value)}
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Override note"
                />
              </>
            ) : (
              <p className="text-sm text-gray-950">Pass {PILLAR_TITLES[pillar]} QA?</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={loading || (hasRedOrGray && !overrideNote.trim())}
                onClick={() => void handlePassConfirm()}
                className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setPassDialogOpen(false)}
                className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {failDialogOpen && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-sm text-gray-950">Why is this failing QA?</p>
            <textarea
              value={failNote}
              onChange={(event) => setFailNote(event.target.value)}
              className="mt-2 min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Required note"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={loading || !failNote.trim()}
                onClick={() => void handleFailConfirm()}
                className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setFailDialogOpen(false)}
                className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}

export function UnlockReportButton({
  detail,
  uid,
  sessionId,
  onStageChange,
  onError,
}: {
  detail: FixJobDetailPayload;
  uid: string;
  sessionId: string;
  onStageChange: (stage: FixJobStage) => void;
  onError: (message: string | null) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unpassed = detail.entitlements.filter(
    (pillar) => detail.qaData?.perPillar?.[pillar] !== 'passed'
  );
  const enabled = unpassed.length === 0;

  if (detail.stage === 'report_ready' || detail.stage === 'delivered') {
    return (
      <p className="mt-3 text-sm font-medium text-green-800">
        Report unlocked — generate your report below
      </p>
    );
  }

  if (detail.stage !== 'qa') {
    return null;
  }

  async function handleUnlock() {
    setLoading(true);
    onError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, toStage: 'report_ready' }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to unlock report');
      }

      onStageChange(payload.data.stage as FixJobStage);
      setConfirmOpen(false);
    } catch (unlockError) {
      onError(
        unlockError instanceof Error ? unlockError.message : 'Failed to unlock report'
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
        title={
          !enabled
            ? `Unpassed pillars: ${unpassed.join(', ')}`
            : undefined
        }
        onClick={() => setConfirmOpen(true)}
        className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Unlock report
      </button>

      {confirmOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-950">
            Unlock report generation? All purchased pillars must stay passed.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleUnlock()}
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
    </div>
  );
}

export function QAPanel({
  detail,
  onQaUpdate,
  onManualCheckChange,
  onRerunChecks,
}: {
  detail: FixJobDetailPayload;
  onQaUpdate: (perPillar: Record<string, string>) => void;
  onManualCheckChange?: (
    pillar: FixPillar,
    itemId: string,
    checked: boolean
  ) => void;
  onRerunChecks?: () => void;
}) {
  const readOnly = detail.stage !== 'qa';

  if (
    detail.stage !== 'qa' &&
    detail.stage !== 'report_ready' &&
    detail.stage !== 'delivered'
  ) {
    return null;
  }

  const purchasedPillars = detail.entitlements;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-950">QA checklist</h2>
      {purchasedPillars.map((pillar) => (
        <PillarQABlock
          key={pillar}
          pillar={pillar}
          detail={detail}
          readOnly={readOnly}
          onQaUpdate={onQaUpdate}
          onManualCheckChange={onManualCheckChange}
          onRerunChecks={onRerunChecks}
        />
      ))}
    </section>
  );
}
