import { describe, expect, it } from 'vitest';

import { validateStageTransition } from '@/lib/fix-jobs/patch-fix-session-stage';
import type { FixJobStage, FixSessionDoc } from '@/lib/types/fix-session';

function baseSession(overrides: Partial<FixSessionDoc> = {}): FixSessionDoc {
  return {
    stage: 'in_progress',
    fixProgress: {
      no_https: {
        status: 'done',
        completedStepIds: ['no_https_1'],
        planSource: 'generic',
      },
    },
    ...overrides,
  };
}

describe('validateStageTransition', () => {
  it('illegal transition → 409 naming both stages', () => {
    const result = validateStageTransition({
      session: baseSession({ stage: 'ready' }),
      toStage: 'qa',
      entitlements: ['security'],
    });

    expect(result).toEqual({
      status: 409,
      error: 'Cannot transition from ready to qa',
    });
  });

  it('in_progress → qa with incomplete signals → 409 listing signal keys', () => {
    const result = validateStageTransition({
      session: baseSession({
        fixProgress: {
          no_https: {
            status: 'pending',
            completedStepIds: [],
            planSource: 'generic',
          },
        },
      }),
      toStage: 'qa',
      entitlements: ['security'],
    });

    expect(result?.status).toBe(409);
    expect(result?.error).toContain('no_https');
  });

  it('in_progress → qa with all done/not_applicable → allowed', () => {
    const result = validateStageTransition({
      session: baseSession({
        fixProgress: {
          no_https: {
            status: 'not_applicable',
            completedStepIds: [],
            planSource: 'generic',
            note: 'Already fixed externally',
          },
        },
      }),
      toStage: 'qa',
      entitlements: ['security'],
    });

    expect(result).toBeNull();
  });

  it('qa → report_ready: blocked when any pillar not passed', () => {
    const result = validateStageTransition({
      session: baseSession({
        stage: 'qa',
        qa: { perPillar: { security: 'in_progress' } },
      }),
      toStage: 'report_ready',
      entitlements: ['security'],
    });

    expect(result).toEqual({
      status: 409,
      error: 'Cannot unlock report: unpassed pillars: security',
    });
  });

  it('qa → report_ready: allowed when all purchased pillars passed (1-pillar session)', () => {
    const result = validateStageTransition({
      session: baseSession({
        stage: 'qa',
        qa: { perPillar: { security: 'passed' } },
      }),
      toStage: 'report_ready',
      entitlements: ['security'],
    });

    expect(result).toBeNull();
  });

  it('qa → report_ready: allowed when all purchased pillars passed (3-pillar session)', () => {
    const result = validateStageTransition({
      session: baseSession({
        stage: 'qa',
        qa: {
          perPillar: {
            speed: 'passed',
            security: 'passed',
            seo_ai_visibility: 'passed',
          },
        },
      }),
      toStage: 'report_ready',
      entitlements: ['speed', 'security', 'seo_ai_visibility'],
    });

    expect(result).toBeNull();
  });

  it('report_ready → delivered → allowed', () => {
    const result = validateStageTransition({
      session: baseSession({ stage: 'report_ready' }),
      toStage: 'delivered',
      entitlements: ['security'],
    });

    expect(result).toBeNull();
  });

  it('delivered stage: all canTransition edges → 409', () => {
    const targets: FixJobStage[] = [
      'awaiting_access',
      'ready',
      'in_progress',
      'qa',
      'report_ready',
    ];

    for (const toStage of targets) {
      const result = validateStageTransition({
        session: baseSession({ stage: 'delivered' }),
        toStage,
        entitlements: ['security'],
      });

      expect(result).toEqual({
        status: 409,
        error: 'Job is delivered and cannot be transitioned further',
      });
    }
  });
});
