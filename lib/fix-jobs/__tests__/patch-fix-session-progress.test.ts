import { describe, expect, it } from 'vitest';

import { getPlaybookEntry } from '@/lib/audit/fixPlaybook';
import { derivePillarClientStatus } from '@/lib/fix-jobs/helpers';
import {
  applySignalProgressUpdate,
  buildAntiDriftQaUpdates,
} from '@/lib/fix-jobs/patch-fix-session-progress';
import { buildClientPillarProgress } from '@/lib/fix-jobs/pillar-rollup';
import type { FixSessionDoc } from '@/lib/types/fix-session';

function baseSession(overrides: Partial<FixSessionDoc> = {}): FixSessionDoc {
  return {
    stage: 'in_progress',
    phase0Complete: true,
    fixProgress: {
      no_https: {
        status: 'pending',
        completedStepIds: [],
        planSource: 'generic',
      },
    },
    ...overrides,
  };
}

describe('applySignalProgressUpdate', () => {
  it('set_steps before phase0Complete → 409', () => {
    const result = applySignalProgressUpdate({
      session: baseSession({ phase0Complete: false }),
      signalKey: 'no_https',
      action: { type: 'set_steps', completedStepIds: ['no_https_1'] },
    });

    expect(result).toEqual({
      status: 409,
      error: 'Complete Phase 0 (backup + baseline) first',
    });
  });

  it('set_steps with unknown signalKey → 400', () => {
    const result = applySignalProgressUpdate({
      session: baseSession(),
      signalKey: 'unknown_signal',
      action: { type: 'set_steps', completedStepIds: [] },
    });

    expect(result).toEqual({
      status: 400,
      error: 'Signal key not found in this session',
    });
  });

  it('set_steps with stale step ID → 400', () => {
    const result = applySignalProgressUpdate({
      session: baseSession(),
      signalKey: 'no_https',
      action: { type: 'set_steps', completedStepIds: ['stale_step_id'] },
    });

    expect(result).toMatchObject({
      status: 400,
    });
    if ('error' in result) {
      expect(result.error).toContain('Invalid step IDs');
    }
  });

  it('set_status not_applicable without note → 400', () => {
    const result = applySignalProgressUpdate({
      session: baseSession(),
      signalKey: 'no_https',
      action: { type: 'set_status', status: 'not_applicable' },
    });

    expect(result).toEqual({
      status: 400,
      error: 'A note is required when marking not applicable',
    });
  });

  it('checking all steps → signal status becomes done', () => {
    const entry = getPlaybookEntry('no_https');
    const result = applySignalProgressUpdate({
      session: baseSession(),
      signalKey: 'no_https',
      action: {
        type: 'set_steps',
        completedStepIds: entry.steps.map((step) => step.id),
      },
    });

    expect('updatedProgress' in result).toBe(true);
    if ('updatedProgress' in result) {
      expect(result.updatedProgress.status).toBe('done');
    }
  });

  it('completing last signal in a pillar → client-facing pillar status becomes done in same transaction', () => {
    const entry = getPlaybookEntry('no_https');
    const result = applySignalProgressUpdate({
      session: baseSession(),
      signalKey: 'no_https',
      action: {
        type: 'set_steps',
        completedStepIds: entry.steps.map((step) => step.id),
      },
    });

    expect('updatedSession' in result).toBe(true);
    if ('updatedSession' in result) {
      expect(derivePillarClientStatus(result.updatedSession, 'security')).toBe('done');
      expect(buildClientPillarProgress(result.updatedSession, 'security').status).toBe(
        'done'
      );
    }
  });
});

describe('buildAntiDriftQaUpdates', () => {
  it('modifying a signal after its pillar passed → decision cleared, perPillar back to in_progress', () => {
    const updates = buildAntiDriftQaUpdates(
      baseSession({
        qa: {
          perPillar: { security: 'passed' },
          decisions: {
            security: {
              status: 'passed',
              at: undefined as never,
              by: 'admin_1',
            },
          },
          passedAt: undefined,
        },
      }),
      'no_https'
    );

    expect(updates['qa.decisions.security']).toBeDefined();
    expect(updates['qa.perPillar.security']).toBe('in_progress');
  });

  it('modifying a signal from a different pillar → other pillar decision unaffected', () => {
    const updates = buildAntiDriftQaUpdates(
      baseSession({
        qa: {
          perPillar: { speed: 'passed', security: 'in_progress' },
          decisions: {
            speed: {
              status: 'passed',
              at: undefined as never,
              by: 'admin_1',
            },
          },
        },
      }),
      'no_https'
    );

    expect(updates).toEqual({});
  });

  it('qa.passedAt cleared when anti-drift fires', () => {
    const updates = buildAntiDriftQaUpdates(
      baseSession({
        qa: {
          perPillar: { security: 'passed' },
          decisions: {
            security: {
              status: 'passed',
              at: undefined as never,
              by: 'admin_1',
            },
          },
          passedAt: undefined,
        },
      }),
      'no_https'
    );

    expect(updates['qa.passedAt']).toBeDefined();
  });
});
