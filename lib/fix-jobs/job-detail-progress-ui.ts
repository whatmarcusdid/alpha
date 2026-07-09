export type DebouncedPatchScheduler = {
  schedule: (key: string, fn: () => Promise<void>) => void;
  cancel: (key: string) => void;
  cancelAll: () => void;
  pendingCount: () => number;
  hasPending: (key: string) => boolean;
};

export function createDebouncedPatchScheduler(
  debounceMs: number
): DebouncedPatchScheduler {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    schedule(key, fn) {
      const existing = timers.get(key);
      if (existing) {
        clearTimeout(existing);
      }

      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          void fn();
        }, debounceMs)
      );
    },
    cancel(key) {
      const existing = timers.get(key);
      if (existing) {
        clearTimeout(existing);
        timers.delete(key);
      }
    },
    cancelAll() {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    },
    pendingCount() {
      return timers.size;
    },
    hasPending(key) {
      return timers.has(key);
    },
  };
}

import { isAllFixSignalKey } from '@/lib/fix-jobs/helpers';

export function countIncompleteSignals(
  fixProgress: Record<string, { status: string }>
): number {
  return Object.entries(fixProgress).filter(
    ([key, progress]) =>
      isAllFixSignalKey(key) &&
      progress.status !== 'done' &&
      progress.status !== 'not_applicable'
  ).length;
}

export function canSubmitNotApplicable(note: string): boolean {
  return note.trim().length > 0;
}
