import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import {
  evaluateAutoPillar,
  QA_AUTO_EVALUATORS,
} from '@/lib/audit/qaEvaluators';
import type { AuditDiff } from '@/lib/audit/diffAuditSnapshots';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixSessionDoc } from '@/lib/types/fix-session';

function auditLead(overrides: Partial<AuditLeadDoc> = {}): AuditLeadDoc {
  return {
    auditLeadId: 'audit_1',
    speedGrade: 'F',
    speedTopIssues: ['lcp_slow'],
    securityGrade: 'D',
    securityFlags: ['no_https'],
    seoGrade: 'C',
    seoFailingSignals: ['missing_title'],
    ...overrides,
  } as AuditLeadDoc;
}

function session(overrides: Partial<FixSessionDoc> = {}): FixSessionDoc {
  return {
    stage: 'qa',
    fixProgress: {},
    ...overrides,
  };
}

describe('QA_AUTO_EVALUATORS', () => {
  it('snapshot_fresh: pass when capturedAt after all completedAt', () => {
    const capturedAt = Timestamp.fromMillis(2_000);
    const completedAt = Timestamp.fromMillis(1_000);

    const result = QA_AUTO_EVALUATORS.snapshot_fresh(
      session({
        afterAudit: {
          capturedAt,
          speed: {
            grade: 'B',
            score: 80,
            topIssues: [],
            status: 'completed',
          },
        },
        fixProgress: {
          render_blocking_resources: {
            status: 'done',
            completedStepIds: ['render_blocking_resources_1'],
            planSource: 'generic',
            completedAt,
          },
        },
      }),
      auditLead(),
      null,
      'speed'
    );

    expect(result).toBe('pass');
  });

  it('snapshot_fresh: fail when capturedAt before any completedAt', () => {
    const capturedAt = Timestamp.fromMillis(1_000);
    const completedAt = Timestamp.fromMillis(2_000);

    const result = QA_AUTO_EVALUATORS.snapshot_fresh(
      session({
        afterAudit: {
          capturedAt,
          speed: {
            grade: 'B',
            score: 80,
            topIssues: [],
            status: 'completed',
          },
        },
        fixProgress: {
          render_blocking_resources: {
            status: 'done',
            completedStepIds: ['render_blocking_resources_1'],
            planSource: 'generic',
            completedAt,
          },
        },
      }),
      auditLead(),
      null,
      'speed'
    );

    expect(result).toBe('fail');
  });

  it('snapshot_fresh: unavailable when afterAudit missing', () => {
    const result = QA_AUTO_EVALUATORS.snapshot_fresh(
      session(),
      auditLead(),
      null,
      'speed'
    );

    expect(result).toBe('unavailable');
  });

  it('snapshot_fresh: pass vacuously when pillar has zero fixProgress entries', () => {
    const result = QA_AUTO_EVALUATORS.snapshot_fresh(
      session({
        afterAudit: {
          capturedAt: Timestamp.fromMillis(2_000),
          speed: {
            grade: 'A',
            score: 95,
            topIssues: [],
            status: 'completed',
          },
        },
        fixProgress: {},
      }),
      auditLead(),
      null,
      'speed'
    );

    expect(result).toBe('pass');
  });

  it('grade_improved: pass, fail, unavailable cases', () => {
    const diff: AuditDiff = {
      speed: {
        gradeBefore: 'F',
        gradeAfter: 'B',
        improved: true,
        resolved: [],
        remaining: [],
        introduced: [],
        status: 'completed',
      },
    };

    expect(
      QA_AUTO_EVALUATORS.grade_improved(session(), auditLead(), diff, 'speed')
    ).toBe('pass');

    expect(
      QA_AUTO_EVALUATORS.grade_improved(
        session(),
        auditLead(),
        {
          speed: {
            gradeBefore: 'B',
            gradeAfter: 'B',
            improved: false,
            resolved: [],
            remaining: [],
            introduced: [],
            status: 'completed',
          },
        },
        'speed'
      )
    ).toBe('fail');

    expect(
      QA_AUTO_EVALUATORS.grade_improved(session(), auditLead(), null, 'speed')
    ).toBe('unavailable');
  });

  it('signals_resolved: pass when remaining empty; fail when not', () => {
    const diff: AuditDiff = {
      speed: {
        gradeBefore: 'F',
        gradeAfter: 'B',
        improved: true,
        resolved: ['lcp_slow'],
        remaining: [],
        introduced: [],
        status: 'completed',
      },
    };

    expect(
      QA_AUTO_EVALUATORS.signals_resolved(session(), auditLead(), diff, 'speed')
    ).toBe('pass');

    expect(
      QA_AUTO_EVALUATORS.signals_resolved(
        session(),
        auditLead(),
        {
          speed: {
            gradeBefore: 'F',
            gradeAfter: 'B',
            improved: true,
            resolved: [],
            remaining: ['lcp_slow'],
            introduced: [],
            status: 'completed',
          },
        },
        'speed'
      )
    ).toBe('fail');
  });

  it('signals_resolved: pass vacuously when zero baseline signals', () => {
    const diff: AuditDiff = {
      speed: {
        gradeBefore: 'A',
        gradeAfter: 'A',
        improved: false,
        resolved: [],
        remaining: [],
        introduced: [],
        status: 'completed',
      },
    };

    expect(
      QA_AUTO_EVALUATORS.signals_resolved(session(), auditLead(), diff, 'speed')
    ).toBe('pass');
  });

  it('no_tier1_flags: fail when blacklisted in after flags', () => {
    const result = QA_AUTO_EVALUATORS.no_tier1_flags(
      session({
        afterAudit: {
          capturedAt: Timestamp.now(),
          security: {
            grade: 'F',
            flags: ['blacklisted'],
            flagTier: 'tier1',
            status: 'completed',
          },
        },
      }),
      auditLead(),
      null,
      'security'
    );

    expect(result).toBe('fail');
  });

  it('no_tier1_flags: pass when only advisory flags remain', () => {
    const result = QA_AUTO_EVALUATORS.no_tier1_flags(
      session({
        afterAudit: {
          capturedAt: Timestamp.now(),
          security: {
            grade: 'C',
            flags: ['missing_security_headers'],
            flagTier: 'advisory',
            status: 'completed',
          },
        },
      }),
      auditLead(),
      null,
      'security'
    );

    expect(result).toBe('pass');
  });

  it('flags_resolved: pass, fail, unavailable cases', () => {
    expect(
      QA_AUTO_EVALUATORS.flags_resolved(
        session(),
        auditLead(),
        {
          security: {
            gradeBefore: 'D',
            gradeAfter: 'A',
            improved: true,
            resolved: ['no_https'],
            remaining: [],
            introduced: [],
            status: 'completed',
          },
        },
        'security'
      )
    ).toBe('pass');

    expect(
      QA_AUTO_EVALUATORS.flags_resolved(
        session(),
        auditLead(),
        {
          security: {
            gradeBefore: 'D',
            gradeAfter: 'C',
            improved: true,
            resolved: [],
            remaining: ['no_https'],
            introduced: [],
            status: 'completed',
          },
        },
        'security'
      )
    ).toBe('fail');

    expect(
      QA_AUTO_EVALUATORS.flags_resolved(session(), auditLead(), null, 'security')
    ).toBe('unavailable');
  });
});

describe('evaluateAutoPillar', () => {
  it('returns an entry for every auto checklist item', () => {
    const results = evaluateAutoPillar(
      'speed',
      session({
        afterAudit: {
          capturedAt: Timestamp.now(),
          speed: {
            grade: 'A',
            score: 95,
            topIssues: [],
            status: 'completed',
          },
        },
      }),
      auditLead({ speedTopIssues: [] }),
      {
        speed: {
          gradeBefore: 'F',
          gradeAfter: 'A',
          improved: true,
          resolved: [],
          remaining: [],
          introduced: [],
          status: 'completed',
        },
      }
    );

    expect(results.snapshot_fresh).toBeDefined();
    expect(results.grade_improved).toBeDefined();
    expect(results.signals_resolved).toBeDefined();
  });
});
