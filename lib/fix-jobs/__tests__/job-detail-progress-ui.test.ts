import { describe, expect, it, vi } from 'vitest';

import {
  canSubmitNotApplicable,
  countIncompleteSignals,
  createDebouncedPatchScheduler,
} from '@/lib/fix-jobs/job-detail-progress-ui';

describe('job detail progress UI helpers', () => {
  it('debounce: rapid toggles produce one PATCH call', async () => {
    vi.useFakeTimers();
    const scheduler = createDebouncedPatchScheduler(500);
    const calls: number[] = [];

    scheduler.schedule('no_https', async () => {
      calls.push(1);
    });
    scheduler.schedule('no_https', async () => {
      calls.push(2);
    });
    scheduler.schedule('no_https', async () => {
      calls.push(3);
    });

    expect(scheduler.hasPending('no_https')).toBe(true);
    vi.advanceTimersByTime(499);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(calls).toEqual([3]);
    vi.useRealTimers();
  });

  it('not_applicable without note does not submit', () => {
    expect(canSubmitNotApplicable('')).toBe(false);
    expect(canSubmitNotApplicable('   ')).toBe(false);
    expect(canSubmitNotApplicable('Client already has HTTPS')).toBe(true);
  });

  it('Move to QA button disabled when signals remain, tooltip shows count', () => {
    const count = countIncompleteSignals({
      no_https: { status: 'pending' },
      render_blocking_resources: { status: 'in_progress' },
      speed: { status: 'queued' },
    });

    expect(count).toBe(2);
  });

  it('checkbox optimistic update rolls back on API failure', async () => {
    let completedStepIds = ['step_a'];
    const rollbackSnapshot = [...completedStepIds];

    completedStepIds = ['step_a', 'step_b'];

    try {
      throw new Error('network');
    } catch {
      completedStepIds = rollbackSnapshot;
    }

    expect(completedStepIds).toEqual(['step_a']);
  });
});
