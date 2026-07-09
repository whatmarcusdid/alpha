'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import {
  ClientUpdatesComposer,
  type ClientUpdatesComposerHandle,
} from '@/components/admin/ClientUpdatesComposer';
import {
  BeforeAfterStrip,
  RerunChecksButton,
} from '@/components/admin/BeforeAfterStrip';
import { QAPanel, UnlockReportButton } from '@/components/admin/QAPanel';
import { ReportModule } from '@/components/admin/ReportModule';
import { HostingContextModule } from '@/components/admin/HostingContextModule';
import { SiteAccessReRequestModule } from '@/components/admin/SiteAccessReRequestModule';
import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  PHASE_0_PRECONDITIONS,
  getPlaybookEntry,
  type AllFixSignalKey,
  type FixPillar,
} from '@/lib/audit/fixPlaybook';
import {
  PILLAR_CHIP_CLASS,
  PILLAR_CHIP_LABEL,
  STAGE_BADGE_CLASS,
  STAGE_LABELS,
} from '@/lib/fix-jobs/admin-stage-styles';
import { derivePillarClientStatus } from '@/lib/fix-jobs/helpers';
import {
  PILLAR_DISPLAY_ORDER,
  PILLAR_TITLES,
  accessNeededLabel,
  getBaselineGradeFromDetail,
  getSignalKeysForPillar,
  gradeBadgeClass,
  shouldMuteJobContent,
  shouldShowAwaitingAccessBanner,
  shouldShowCredentialReveal,
  severityBadgeClass,
  signalStatusClass,
  signalStatusLabel,
} from '@/lib/fix-jobs/job-detail-utils';
import {
  canSubmitNotApplicable,
  countIncompleteSignals,
  createDebouncedPatchScheduler,
} from '@/lib/fix-jobs/job-detail-progress-ui';
import type {
  FixJobDetailPayload,
  FixJobStage,
  FixSessionDoc,
  RevealedSiteFixCredentials,
  SerializableSignalProgress,
} from '@/lib/types/fix-session';

type Props = {
  sessionId: string;
};

type CardErrors = Record<string, string>;

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) {
    return url;
  }

  return `${url.slice(0, maxLength - 1)}…`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="min-h-[40px] rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? 'Copied' : `Copy ${label}`}
    </button>
  );
}

function CredentialRevealModule({
  sessionId,
  uid,
  stage,
}: {
  sessionId: string;
  uid: string;
  stage: FixJobDetailPayload['stage'];
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSiteFixCredentials | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const hideCredentials = useCallback(() => {
    setRevealed(null);
    setConfirmOpen(false);
    setSecondsLeft(60);
  }, []);

  useEffect(() => {
    if (!revealed) {
      return;
    }

    setSecondsLeft(60);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        hideCredentials();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [revealed, hideCredentials]);

  if (!shouldShowCredentialReveal(stage)) {
    return null;
  }

  async function handleConfirmReveal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/credentials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reveal credentials');
      }

      setRevealed(payload.data.credentials as RevealedSiteFixCredentials);
      setConfirmOpen(false);
    } catch (revealError) {
      setError(
        revealError instanceof Error
          ? revealError.message
          : 'Failed to reveal credentials'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-950">Site Access</p>
        {!revealed && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirmOpen(true)}
            className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370] disabled:opacity-60"
          >
            Reveal credentials
          </button>
        )}
      </div>

      {confirmOpen && !revealed && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            Credentials will be visible on screen. Reveal?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleConfirmReveal()}
              disabled={loading}
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

      {revealed && (
        <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600">Hiding in {secondsLeft}s…</p>
            <button
              type="button"
              onClick={hideCredentials}
              className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Hide
            </button>
          </div>
          {(
            [
              ['Method', revealed.method],
              ['Login URL', revealed.loginUrl],
              ['Username', revealed.username],
              ['Password', revealed.password],
              ['Hosting provider', revealed.hostingProvider],
              ['Notes', revealed.notes],
            ] as const
          ).map(([label, value]) =>
            value ? (
              <div key={label} className="flex flex-wrap items-center gap-2">
                <span className="min-w-28 text-sm font-medium text-gray-950">{label}</span>
                <span className="flex-1 break-all text-sm text-gray-700">{value}</span>
                <CopyButton value={value} label={label} />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function StageControl({
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
  const incompleteCount = countIncompleteSignals(detail.fixProgress);

  const nextStage = useMemo((): FixJobStage | null => {
    if (detail.stage === 'ready') {
      return 'in_progress';
    }

    if (detail.stage === 'in_progress') {
      return 'qa';
    }

    return null;
  }, [detail.stage]);

  const buttonLabel = detail.stage === 'ready' ? 'Start work' : 'Move to QA';
  const confirmMessage =
    detail.stage === 'ready'
      ? 'Start work on this job? Make sure Phase 0 is complete.'
      : 'Move to QA? This confirms all signals are complete.';

  if (!nextStage) {
    return null;
  }

  async function handleConfirm() {
    setLoading(true);
    onError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/stage`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, toStage: nextStage }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update stage');
      }

      onStageChange(payload.data.stage as FixJobStage);
      setConfirmOpen(false);
    } catch (stageError) {
      onError(
        stageError instanceof Error ? stageError.message : 'Failed to update stage'
      );
    } finally {
      setLoading(false);
    }
  }

  const disabled = detail.stage === 'in_progress' && incompleteCount > 0;

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={disabled || loading}
        title={
          disabled
            ? `${incompleteCount} signal${incompleteCount === 1 ? '' : 's'} remaining`
            : undefined
        }
        onClick={() => setConfirmOpen(true)}
        className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {confirmOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-950">{confirmMessage}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
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
    </div>
  );
}

function Phase0Block({
  muted,
  phase0Complete,
  uid,
  sessionId,
  onPhase0Complete,
}: {
  muted: boolean;
  phase0Complete: boolean;
  uid: string;
  sessionId: string;
  onPhase0Complete: () => void;
}) {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked =
    phase0Complete ||
    PHASE_0_PRECONDITIONS.every((step) => checkedIds.includes(step.id));

  async function handleConfirmComplete() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/progress`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            action: { type: 'set_phase0', complete: true },
          }),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to mark Phase 0 complete');
      }

      onPhase0Complete();
      setConfirmOpen(false);
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : 'Failed to mark Phase 0 complete'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border-2 border-[#1B4A41]/20 bg-[#FAF9F5] p-5">
      <h2 className="text-lg font-semibold text-[#1B4A41]">
        Phase 0 — Before you start
      </h2>
      <ul className={`mt-4 space-y-3 ${muted ? 'opacity-50' : ''}`}>
        {PHASE_0_PRECONDITIONS.map((step) => {
          const accessLabel = accessNeededLabel(step.accessNeeded);
          const checked = phase0Complete || checkedIds.includes(step.id);

          return (
            <li key={step.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={checked}
                disabled={phase0Complete || muted}
                onChange={() => {
                  setCheckedIds((current) =>
                    current.includes(step.id)
                      ? current.filter((id) => id !== step.id)
                      : [...current, step.id]
                  );
                }}
                className="mt-1 h-4 w-4"
                aria-label={`Phase 0 step ${step.id}`}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-950">{step.instruction}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {accessLabel && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {accessLabel}
                    </span>
                  )}
                  {step.tools?.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!phase0Complete && allChecked && !muted && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370]"
          >
            Mark Phase 0 complete
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm text-gray-950">
            Confirm Phase 0 complete? This confirms you have created a backup and
            recorded baseline metrics.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleConfirmComplete()}
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
    </section>
  );
}

function FixSignalCard({
  signalKey,
  progress,
  muted,
  phase0Complete,
  cardError,
  onToggleStep,
  onMarkNotApplicable,
  onSaveNote,
  onDraftClientUpdate,
}: {
  signalKey: AllFixSignalKey;
  progress: SerializableSignalProgress;
  muted: boolean;
  phase0Complete: boolean;
  cardError: string | null;
  onToggleStep: (signalKey: AllFixSignalKey, stepId: string) => void;
  onMarkNotApplicable: (signalKey: AllFixSignalKey, note: string) => Promise<void>;
  onSaveNote: (signalKey: AllFixSignalKey, note: string) => Promise<void>;
  onDraftClientUpdate: (signalKey: AllFixSignalKey) => void;
}) {
  const entry = getPlaybookEntry(signalKey);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<'not_applicable' | 'note' | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const stepsMuted = progress.status === 'not_applicable';

  async function handleModalSubmit() {
    if (modal === 'not_applicable' && !canSubmitNotApplicable(noteDraft)) {
      setModalError('A note is required when marking not applicable');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      if (modal === 'not_applicable') {
        await onMarkNotApplicable(signalKey, noteDraft.trim());
      } else if (modal === 'note') {
        await onSaveNote(signalKey, noteDraft.trim());
      }

      setModal(null);
      setNoteDraft('');
      setMenuOpen(false);
    } catch (submitError) {
      setModalError(
        submitError instanceof Error ? submitError.message : 'Failed to save'
      );
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <article
      className={`rounded-lg border border-gray-200 bg-white ${muted || stepsMuted ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 p-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-950">{entry.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">SOP: {entry.sopReference}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass(entry.severity)}`}
            >
              {entry.severity}
            </span>
            <span className="text-xs text-zinc-500">~{entry.estimatedMinutes} min</span>
          </div>
          {!muted && (
            <div className="relative">
              <button
                type="button"
                aria-label="Card actions"
                onClick={() => setMenuOpen((open) => !open)}
                className="min-h-[40px] min-w-[40px] rounded-full border border-gray-300 text-lg leading-none text-gray-700"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-gray-950 hover:bg-gray-50"
                    onClick={() => {
                      onDraftClientUpdate(signalKey);
                      setMenuOpen(false);
                    }}
                  >
                    Draft client update
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-gray-950 hover:bg-gray-50"
                    onClick={() => {
                      setModal('not_applicable');
                      setNoteDraft(progress.note ?? '');
                      setMenuOpen(false);
                    }}
                  >
                    Mark not applicable…
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-gray-950 hover:bg-gray-50"
                    onClick={() => {
                      setModal('note');
                      setNoteDraft(progress.note ?? '');
                      setMenuOpen(false);
                    }}
                  >
                    Add note
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ul className={`space-y-3 p-4 ${stepsMuted ? 'opacity-60' : ''}`}>
        {entry.steps.map((step) => {
          const accessLabel = accessNeededLabel(step.accessNeeded);
          const checked = progress.completedStepIds.includes(step.id);
          const disabled =
            muted ||
            !phase0Complete ||
            progress.status === 'not_applicable' ||
            progress.status === 'done';

          return (
            <li key={step.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                title={!phase0Complete ? 'Complete Phase 0 first' : undefined}
                onChange={() => onToggleStep(signalKey, step.id)}
                className={`mt-1 h-4 w-4 ${!phase0Complete ? 'opacity-60' : ''}`}
                aria-label={step.instruction}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-950">{step.instruction}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {accessLabel && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {accessLabel}
                    </span>
                  )}
                  {step.tools?.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {progress.note && (
        <p className="px-4 pb-2 text-sm text-zinc-500">Note: {progress.note}</p>
      )}

      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-950">
          <span className="font-semibold">Verify:</span> {entry.verification}
        </p>
        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${signalStatusClass(progress.status)}`}
          >
            {signalStatusLabel(progress.status)}
          </span>
        </div>
      </div>

      {cardError && <p className="px-4 pb-4 text-sm text-red-700">{cardError}</p>}

      {modal && (
        <div className="border-t border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-950">
            {modal === 'not_applicable' ? 'Mark not applicable' : 'Add note'}
          </p>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="mt-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder={
              modal === 'not_applicable' ? 'Why is this signal not applicable?' : 'Note'
            }
          />
          {modalError && <p className="mt-2 text-sm text-red-700">{modalError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={modalLoading}
              onClick={() => void handleModalSubmit()}
              className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521]"
            >
              {modal === 'not_applicable' ? 'Confirm' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setModal(null);
                setModalError(null);
              }}
              className="min-h-[40px] rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function PillarSection({
  pillar,
  detail,
  muted,
  phase0Complete,
  cardErrors,
  onToggleStep,
  onMarkNotApplicable,
  onSaveNote,
  onDraftClientUpdate,
}: {
  pillar: FixPillar;
  detail: FixJobDetailPayload;
  muted: boolean;
  phase0Complete: boolean;
  cardErrors: CardErrors;
  onToggleStep: (signalKey: AllFixSignalKey, stepId: string) => void;
  onMarkNotApplicable: (signalKey: AllFixSignalKey, note: string) => Promise<void>;
  onSaveNote: (signalKey: AllFixSignalKey, note: string) => Promise<void>;
  onDraftClientUpdate: (signalKey: AllFixSignalKey) => void;
}) {
  const signalKeys = getSignalKeysForPillar(detail.fixProgress, pillar);
  const sessionForDerive = {
    stage: detail.stage,
    fixProgress: detail.fixProgress,
  } as FixSessionDoc;
  const pillarStatus = derivePillarClientStatus(sessionForDerive, pillar);
  const baselineGrade = getBaselineGradeFromDetail(pillar, detail.baseline);

  const pillarKey =
    pillar === 'speed' ? 'speed' : pillar === 'security' ? 'security' : 'seo';

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-950">{PILLAR_TITLES[pillar]}</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeBadgeClass(baselineGrade)}`}
        >
          Grade {baselineGrade}
        </span>
        <span className="text-sm text-zinc-600">
          {signalKeys.length} signal{signalKeys.length === 1 ? '' : 's'} to fix
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {pillarStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <BeforeAfterStrip
        pillarKey={pillarKey}
        pillar={pillar}
        baseline={detail.baseline}
        detail={detail}
      />

      {signalKeys.length === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          ✓ No issues found in this pillar
        </div>
      ) : (
        <div className="space-y-4">
          {signalKeys.map((signalKey) => (
            <FixSignalCard
              key={signalKey}
              signalKey={signalKey}
              progress={detail.fixProgress[signalKey]}
              muted={muted}
              phase0Complete={phase0Complete}
              cardError={cardErrors[signalKey] ?? null}
              onDraftClientUpdate={onDraftClientUpdate}
              onToggleStep={onToggleStep}
              onMarkNotApplicable={onMarkNotApplicable}
              onSaveNote={onSaveNote}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 rounded-lg bg-gray-200" />
      <div className="h-40 rounded-lg bg-gray-200" />
      <div className="space-y-3">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-32 rounded-lg bg-gray-200" />
        <div className="h-32 rounded-lg bg-gray-200" />
        <div className="h-32 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

function updateSignalProgress(
  setDetail: Dispatch<SetStateAction<FixJobDetailPayload | null>>,
  signalKey: string,
  updater: (current: SerializableSignalProgress) => SerializableSignalProgress
) {
  setDetail((current) => {
    if (!current?.fixProgress[signalKey]) {
      return current;
    }

    return {
      ...current,
      fixProgress: {
        ...current.fixProgress,
        [signalKey]: updater(current.fixProgress[signalKey]),
      },
    };
  });
}

export function JobDetailScreen({ sessionId }: Props) {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');
  const fromStage = searchParams.get('fromStage');

  const [detail, setDetail] = useState<FixJobDetailPayload | null>(null);
  const [rerunRequestNonce, setRerunRequestNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});

  const composerRef = useRef<ClientUpdatesComposerHandle>(null);
  const debounceScheduler = useRef(createDebouncedPatchScheduler(500));
  const rollbackSnapshots = useRef<Map<string, string[]>>(new Map());

  useEffect(() => {
    return () => debounceScheduler.current.cancelAll();
  }, []);

  const backHref = useMemo(() => {
    if (fromStage && fromStage !== 'all') {
      return `/admin/fix-jobs?stage=${encodeURIComponent(fromStage)}`;
    }

    return '/admin/fix-jobs';
  }, [fromStage]);

  const fetchDetail = useCallback(async () => {
    if (!uid) {
      setError('Missing client uid in URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}?uid=${encodeURIComponent(uid)}`
      );
      const payload = await response.json();

      if (response.status === 404) {
        setNotFound(true);
        setDetail(null);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load fix job');
      }

      setDetail(payload.data as FixJobDetailPayload);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Failed to load fix job'
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, uid]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const patchProgress = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetchWithAdminAuth(
        `/api/admin/fix-jobs/${sessionId}/progress`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update progress');
      }

      return payload;
    },
    [sessionId]
  );

  const handleToggleStep = useCallback(
    (signalKey: AllFixSignalKey, stepId: string) => {
      if (!detail || !uid) {
        return;
      }

      const previousIds = detail.fixProgress[signalKey]?.completedStepIds ?? [];
      if (!debounceScheduler.current.hasPending(signalKey)) {
        rollbackSnapshots.current.set(signalKey, [...previousIds]);
      }

      const nextIds = previousIds.includes(stepId)
        ? previousIds.filter((id) => id !== stepId)
        : [...previousIds, stepId];

      updateSignalProgress(setDetail, signalKey, (current) => ({
        ...current,
        completedStepIds: nextIds,
      }));
      setCardErrors((current) => ({ ...current, [signalKey]: '' }));

      debounceScheduler.current.schedule(signalKey, async () => {
        try {
          const payload = await patchProgress({
            uid,
            signalKey,
            action: { type: 'set_steps', completedStepIds: nextIds },
          });

          updateSignalProgress(setDetail, signalKey, (current) => ({
            ...current,
            status: payload.data.status,
            completedStepIds: nextIds,
          }));
          rollbackSnapshots.current.delete(signalKey);
        } catch (patchError) {
          const rollbackIds = rollbackSnapshots.current.get(signalKey) ?? previousIds;
          updateSignalProgress(setDetail, signalKey, (current) => ({
            ...current,
            completedStepIds: rollbackIds,
          }));
          rollbackSnapshots.current.delete(signalKey);
          setCardErrors((current) => ({
            ...current,
            [signalKey]:
              patchError instanceof Error
                ? patchError.message
                : 'Failed to save progress',
          }));
        }
      });
    },
    [detail, patchProgress, uid]
  );

  const handleMarkNotApplicable = useCallback(
    async (signalKey: AllFixSignalKey, note: string) => {
      if (!uid) {
        return;
      }

      await patchProgress({
        uid,
        signalKey,
        action: { type: 'set_status', status: 'not_applicable', note },
      });

      updateSignalProgress(setDetail, signalKey, (current) => ({
        ...current,
        status: 'not_applicable',
        note,
      }));
    },
    [patchProgress, uid]
  );

  const handleSaveNote = useCallback(
    async (signalKey: AllFixSignalKey, note: string) => {
      if (!uid) {
        return;
      }

      await patchProgress({
        uid,
        signalKey,
        action: { type: 'set_note', note },
      });

      updateSignalProgress(setDetail, signalKey, (current) => ({
        ...current,
        note,
      }));
    },
    [patchProgress, uid]
  );

  const handleDraftClientUpdate = useCallback((signalKey: AllFixSignalKey) => {
    composerRef.current?.prefill(getPlaybookEntry(signalKey).clientSummaryTemplate);
  }, []);

  const muted = detail ? shouldMuteJobContent(detail.stage) : false;
  const purchasedPillars = detail
    ? PILLAR_DISPLAY_ORDER.filter((pillar) => detail.entitlements.includes(pillar))
    : [];

  if (loading) {
    return <DetailSkeleton />;
  }

  if (notFound) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <p className="text-sm text-gray-950">Fix job not found.</p>
        <Link href={backHref} className="mt-3 inline-block text-sm font-semibold text-blue-700">
          ← Fix Jobs
        </Link>
      </div>
    );
  }

  if (error || !detail || !uid) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error ?? 'Failed to load fix job'}</p>
        <button
          type="button"
          onClick={() => void fetchDetail()}
          className="mt-3 min-h-[40px] rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-5 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur md:-mx-6 md:px-6">
        <Link href={backHref} className="text-sm font-semibold text-blue-700">
          ← Fix Jobs
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-950">{detail.customerName}</h1>
            {detail.businessName && (
              <p className="text-sm text-zinc-600">{detail.businessName}</p>
            )}
            {detail.siteUrl && (
              <a
                href={detail.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-blue-700 hover:text-blue-800"
              >
                {truncateUrl(detail.siteUrl)}
              </a>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              Audit {detail.auditLeadId} · Order {detail.orderId}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_BADGE_CLASS[detail.stage]}`}
            >
              {STAGE_LABELS[detail.stage]}
            </span>
            {detail.entitlements.map((pillar) => (
              <span
                key={pillar}
                className={`rounded px-2 py-0.5 text-xs font-semibold ${PILLAR_CHIP_CLASS[pillar]}`}
              >
                {PILLAR_CHIP_LABEL[pillar]}
              </span>
            ))}
          </div>
        </div>

        <StageControl
          detail={detail}
          uid={uid}
          sessionId={sessionId}
          onStageChange={(stage) => setDetail((current) => (current ? { ...current, stage } : current))}
          onError={setHeaderError}
        />
        <RerunChecksButton
          sessionId={sessionId}
          uid={uid}
          stage={detail.stage}
          afterAuditCapturedAt={detail.afterAudit?.capturedAt ?? null}
          openRequestNonce={rerunRequestNonce}
          onAfterAudit={(afterAudit) =>
            setDetail((current) => (current ? { ...current, afterAudit } : current))
          }
        />
        <UnlockReportButton
          detail={detail}
          uid={uid}
          sessionId={sessionId}
          onStageChange={(stage) =>
            setDetail((current) => (current ? { ...current, stage } : current))
          }
          onError={setHeaderError}
        />
        {headerError && <p className="mt-2 text-sm text-red-700">{headerError}</p>}

        <HostingContextModule
          fixJobId={sessionId}
          uid={detail.uid}
          hostingContext={detail.hostingContext}
          onConfirmed={(updated) =>
            setDetail((current) => (current ? { ...current, hostingContext: updated } : current))
          }
        />

        <CredentialRevealModule sessionId={sessionId} uid={detail.uid} stage={detail.stage} />

        <SiteAccessReRequestModule
          fixJobId={sessionId}
          uid={detail.uid}
          stage={detail.stage}
          siteAccessRequest={detail.siteAccessRequest}
          onSiteAccessRequestChange={(next) =>
            setDetail((current) => (current ? { ...current, siteAccessRequest: next } : current))
          }
        />

        <ClientUpdatesComposer
          ref={composerRef}
          fixJobId={sessionId}
          uid={uid}
          stage={detail.stage}
          recentUpdates={detail.recentUpdates}
        />
      </div>

      {shouldShowAwaitingAccessBanner(detail.stage) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Waiting on customer site access — work is blocked.
        </div>
      )}

      <Phase0Block
        muted={muted}
        phase0Complete={detail.phase0Complete}
        uid={uid}
        sessionId={sessionId}
        onPhase0Complete={() =>
          setDetail((current) => (current ? { ...current, phase0Complete: true } : current))
        }
      />

      <QAPanel
        detail={detail}
        onRerunChecks={() => setRerunRequestNonce((value) => value + 1)}
        onQaUpdate={(perPillar) =>
          setDetail((current) =>
            current
              ? {
                  ...current,
                  qa: current.qa ? { ...current.qa, perPillar } : { perPillar },
                  qaData: current.qaData
                    ? { ...current.qaData, perPillar }
                    : {
                        perPillar,
                        manualChecks: {},
                        decisions: {},
                        passedAt: null,
                        autoEvals: null,
                      },
                }
              : current
          )
        }
        onManualCheckChange={(pillar, itemId, checked) =>
          setDetail((current) => {
            if (!current?.qaData) {
              return current;
            }

            return {
              ...current,
              qaData: {
                ...current.qaData,
                manualChecks: {
                  ...current.qaData.manualChecks,
                  [pillar]: {
                    ...(current.qaData.manualChecks[pillar] ?? {}),
                    [itemId]: {
                      checked,
                      at: new Date().toISOString(),
                    },
                  },
                },
                perPillar: {
                  ...current.qaData.perPillar,
                  [pillar]:
                    current.qaData.perPillar[pillar] === 'not_started'
                      ? 'in_progress'
                      : current.qaData.perPillar[pillar],
                },
              },
            };
          })
        }
      />

      <ReportModule
        detail={detail}
        uid={uid}
        sessionId={sessionId}
        onReportGenerated={(reportData) =>
          setDetail((current) =>
            current
              ? {
                  ...current,
                  reportData,
                  report: {
                    status: reportData.status,
                    reportId: reportData.reportId ?? undefined,
                    generatedAt: reportData.generatedAt ?? undefined,
                    sentAt: reportData.sentAt ?? undefined,
                    deliveryNote: reportData.deliveryNote,
                  },
                }
              : current
          )
        }
        onDelivered={({ sentAt, loomUrl, reportUrl }) =>
          setDetail((current) =>
            current
              ? {
                  ...current,
                  stage: 'delivered',
                  reportData: current.reportData
                    ? {
                        ...current.reportData,
                        status: 'sent',
                        sentAt,
                        loomUrl,
                        reportUrl,
                        deliveryStatus: 'delivered',
                      }
                    : {
                        status: 'sent',
                        reportId: current.report?.reportId ?? null,
                        generatedAt: current.report?.generatedAt ?? null,
                        sentAt,
                        deliveryNote: current.report?.deliveryNote ?? null,
                        qaOverrideNotes: {},
                        loomUrl,
                        reportUrl,
                        deliveryStatus: 'delivered',
                      },
                  report: {
                    status: 'sent',
                    reportId: current.report?.reportId,
                    generatedAt: current.report?.generatedAt,
                    sentAt,
                    deliveryNote: current.report?.deliveryNote ?? null,
                  },
                }
              : current
          )
        }
      />

      <div className="space-y-10">
        {purchasedPillars.map((pillar) => (
          <PillarSection
            key={pillar}
            pillar={pillar}
            detail={detail}
            muted={muted}
            phase0Complete={detail.phase0Complete}
            cardErrors={cardErrors}
            onDraftClientUpdate={handleDraftClientUpdate}
            onToggleStep={handleToggleStep}
            onMarkNotApplicable={handleMarkNotApplicable}
            onSaveNote={handleSaveNote}
          />
        ))}
      </div>
    </div>
  );
}
