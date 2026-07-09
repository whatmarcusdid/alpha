'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import {
  formatComposerTimestamp,
  isCharacterCounterWarning,
  isPostUpdateDisabled,
} from '@/lib/fix-jobs/fix-update-utils';
import type { FixJobStage } from '@/lib/types/fix-session';
import type { RecentFixUpdate } from '@/lib/types/fix-update';

export type ClientUpdatesComposerHandle = {
  prefill: (text: string) => void;
};

type Props = {
  fixJobId: string;
  uid: string;
  stage: FixJobStage;
  recentUpdates: RecentFixUpdate[];
  onUpdatesChange?: (updates: RecentFixUpdate[]) => void;
};

type OptimisticUpdate = RecentFixUpdate & { optimistic?: boolean };

function toDisplayUpdate(update: OptimisticUpdate): {
  message: string;
  timestampLabel: string;
} {
  const createdAt = update.createdAt ? new Date(update.createdAt) : new Date();

  return {
    message: update.message,
    timestampLabel: formatComposerTimestamp(createdAt),
  };
}

export const ClientUpdatesComposer = forwardRef<ClientUpdatesComposerHandle, Props>(
  function ClientUpdatesComposer(
    { fixJobId, uid, stage, recentUpdates, onUpdatesChange },
    ref
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [localUpdates, setLocalUpdates] = useState<OptimisticUpdate[]>(recentUpdates);

    useEffect(() => {
      setLocalUpdates(recentUpdates);
    }, [recentUpdates]);

    useImperativeHandle(ref, () => ({
      prefill(text: string) {
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setMessage(text);
        window.setTimeout(() => textareaRef.current?.focus(), 150);
      },
    }));

    const visibleUpdates = useMemo(
      () => localUpdates.slice(0, 3).map(toDisplayUpdate),
      [localUpdates]
    );

    const disabled = stage === 'awaiting_access';
    const charCount = message.length;
    const counterClass = isCharacterCounterWarning(charCount)
      ? 'text-red-700'
      : 'text-zinc-500';
    const postDisabled = disabled || loading || isPostUpdateDisabled(charCount);

    async function handlePost() {
      if (postDisabled) {
        return;
      }

      const trimmed = message.trim();
      const optimisticUpdate: OptimisticUpdate = {
        id: `optimistic-${Date.now()}`,
        message: trimmed,
        createdAt: new Date().toISOString(),
        pillar: 'general',
        visibility: 'client',
        pinned: false,
        optimistic: true,
      };

      setError(null);
      setLocalUpdates((current) => [optimisticUpdate, ...current]);
      setLoading(true);

      try {
        const response = await fetchWithAdminAuth(
          `/api/admin/fix-jobs/${fixJobId}/updates`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, message: trimmed }),
          }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to post update');
        }

        const persisted: RecentFixUpdate = {
          id: payload.data.updateId as string,
          message: trimmed,
          createdAt: new Date().toISOString(),
          pillar: 'general',
          visibility: 'client',
          pinned: false,
        };

        setLocalUpdates((current) => [
          persisted,
          ...current.filter((update) => update.id !== optimisticUpdate.id),
        ]);
        onUpdatesChange?.([persisted, ...recentUpdates]);
        setMessage('');
      } catch (postError) {
        setLocalUpdates((current) =>
          current.filter((update) => update.id !== optimisticUpdate.id)
        );
        setError(
          postError instanceof Error ? postError.message : 'Failed to post update'
        );
      } finally {
        setLoading(false);
      }
    }

    return (
      <div
        ref={rootRef}
        className="mt-4 rounded-lg border border-gray-200 bg-[#FAF9F5] p-4"
      >
        <p className="text-sm font-semibold text-gray-950">Client updates</p>

        {visibleUpdates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No updates posted yet. Customers see these in their dashboard — post one
            when you start work.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visibleUpdates.map((update, index) => (
              <li key={`${update.message}-${index}`} className="text-sm text-zinc-600">
                &ldquo;{update.message}&rdquo; · {update.timestampLabel}
              </li>
            ))}
          </ul>
        )}

        <textarea
          ref={textareaRef}
          value={message}
          disabled={disabled}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What did we just do for this customer? Keep it plain — no tool names."
          className="mt-4 min-h-[40px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
          rows={3}
          maxLength={281}
        />

        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className={`text-xs ${counterClass}`}>{charCount} / 280</span>
          <button
            type="button"
            disabled={postDisabled}
            title={disabled ? 'No work to report yet' : undefined}
            onClick={() => void handlePost()}
            className="min-h-[40px] rounded-full bg-[#9be382] px-4 py-2 text-sm font-semibold text-[#232521] hover:bg-[#8dd370] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Post update
          </button>
        </div>
      </div>
    );
  }
);
