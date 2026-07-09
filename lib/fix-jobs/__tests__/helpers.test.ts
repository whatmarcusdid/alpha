import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import type { FixSession } from '@/components/dashboard/ActiveSiteFixesCard';
import {
  buildInitialFixProgress,
  canTransition,
  deriveNextAction,
  derivePillarClientStatus,
  shouldSeedFixSessionAdminFields,
} from '@/lib/fix-jobs/helpers';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixJobStage, FixSessionDoc } from '@/lib/types/fix-session';

function baseAuditLead(overrides: Partial<AuditLeadDoc> = {}): AuditLeadDoc {
  return {
    auditLeadId: 'audit_1',
    firstName: 'Test',
    businessName: 'Test Co',
    email: 'test@example.com',
    websiteUrl: 'https://example.com',
    source: 'public_audit',
    schemaVersion: 'v2',
    timestamp: Timestamp.now(),
    auditStatus: 'completed',
    speedGrade: 'C',
    speedScore: 70,
    speedTopIssues: ['oversized_images', 'render_blocking_resources'],
    speedNarrative: '',
    speedStatus: 'completed',
    securityGrade: 'B',
    securityFlags: ['no_https', 'missing_security_headers'],
    securityFlagTier: 'tier1',
    securityNarrative: '',
    securityStatus: 'completed',
    seoGrade: 'C',
    seoScore: 65,
    seoFailingSignals: ['missing_title_tag', 'weak_h1'],
    seoNarrative: '',
    seoStatus: 'completed',
    ...overrides,
  };
}

describe('canTransition', () => {
  const legal: Array<[FixJobStage, FixJobStage]> = [
    ['awaiting_access', 'ready'],
    ['ready', 'in_progress'],
    ['in_progress', 'qa'],
    ['qa', 'in_progress'],
    ['qa', 'report_ready'],
    ['report_ready', 'delivered'],
  ];

  it.each(legal)('%s → %s returns true', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  const illegal: Array<[FixJobStage, FixJobStage]> = [
    ['delivered', 'awaiting_access'],
    ['delivered', 'ready'],
    ['delivered', 'in_progress'],
    ['delivered', 'qa'],
    ['delivered', 'report_ready'],
    ['ready', 'delivered'],
    ['in_progress', 'delivered'],
    ['awaiting_access', 'in_progress'],
    ['awaiting_access', 'delivered'],
    ['ready', 'qa'],
    ['report_ready', 'in_progress'],
  ];

  it.each(illegal)('%s → %s returns false', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('same stage returns false', () => {
    expect(canTransition('qa', 'qa')).toBe(false);
  });
});

describe('derivePillarClientStatus', () => {
  it('returns awaiting_access when session stage is awaiting_access', () => {
    const session: FixSessionDoc = {
      stage: 'awaiting_access',
      fixProgress: {
        oversized_images: {
          status: 'done',
          completedStepIds: ['oversized_images_1'],
          planSource: 'generic',
        },
      },
    };

    expect(derivePillarClientStatus(session, 'speed')).toBe('awaiting_access');
  });

  it('returns done when all pillar signals are done or not_applicable', () => {
    const session: FixSessionDoc = {
      stage: 'in_progress',
      fixProgress: {
        oversized_images: {
          status: 'done',
          completedStepIds: ['oversized_images_1'],
          planSource: 'generic',
        },
        render_blocking_resources: {
          status: 'not_applicable',
          completedStepIds: [],
          planSource: 'generic',
        },
      },
    };

    expect(derivePillarClientStatus(session, 'speed')).toBe('done');
  });

  it('returns in_progress when any signal is in_progress', () => {
    const session: FixSessionDoc = {
      stage: 'in_progress',
      fixProgress: {
        oversized_images: {
          status: 'in_progress',
          completedStepIds: [],
          planSource: 'generic',
        },
      },
    };

    expect(derivePillarClientStatus(session, 'speed')).toBe('in_progress');
  });

  it('returns in_progress when any signal has partial completedStepIds', () => {
    const session: FixSessionDoc = {
      stage: 'in_progress',
      fixProgress: {
        no_https: {
          status: 'pending',
          completedStepIds: ['no_https_1'],
          planSource: 'generic',
        },
      },
    };

    expect(derivePillarClientStatus(session, 'security')).toBe('in_progress');
  });

  it('returns queued when no signals have started', () => {
    const session: FixSessionDoc = {
      stage: 'in_progress',
      fixProgress: {
        oversized_images: {
          status: 'pending',
          completedStepIds: [],
          planSource: 'generic',
        },
      },
    };

    expect(derivePillarClientStatus(session, 'speed')).toBe('queued');
  });

  it('returns done when purchased pillar has zero failing signals seeded', () => {
    const session: FixSessionDoc = {
      stage: 'in_progress',
      fixProgress: {},
    };

    expect(derivePillarClientStatus(session, 'speed')).toBe('done');
  });

  it('returns queued for legacy docs without signal-level fixProgress', () => {
    const session: FixSessionDoc = {
      fixProgress: {
        speed: {
          status: 'in_progress',
          completedStepIds: [],
          planSource: 'generic',
        },
      } as unknown as FixSessionDoc['fixProgress'],
    };

    expect(derivePillarClientStatus(session, 'speed')).toBe('queued');
  });

  it('returns queued when fixProgress is absent', () => {
    const session: FixSessionDoc = {};
    expect(derivePillarClientStatus(session, 'seo_ai_visibility')).toBe('queued');
  });
});

describe('buildInitialFixProgress', () => {
  it('only seeds signals for purchased pillars', () => {
    const auditLead = baseAuditLead();
    const progress = buildInitialFixProgress(auditLead, ['speed']);

    expect(Object.keys(progress)).toEqual(
      expect.arrayContaining(['oversized_images', 'render_blocking_resources'])
    );
    expect(progress.no_https).toBeUndefined();
    expect(progress.missing_title_tag).toBeUndefined();
  });

  it('only seeds failing signals from the audit lead', () => {
    const auditLead = baseAuditLead({
      speedTopIssues: ['oversized_images'],
    });
    const progress = buildInitialFixProgress(auditLead, ['speed']);

    expect(Object.keys(progress)).toEqual(['oversized_images']);
    expect(progress.render_blocking_resources).toBeUndefined();
  });

  it('produces zero entries for a purchased pillar with no failing signals', () => {
    const auditLead = baseAuditLead({
      speedTopIssues: [],
      securityFlags: [],
      seoFailingSignals: [],
    });
    const progress = buildInitialFixProgress(auditLead, [
      'speed',
      'security',
      'seo_ai_visibility',
    ]);

    expect(Object.keys(progress)).toHaveLength(0);
  });

  it('seeds each entry with pending status, empty steps, and generic planSource', () => {
    const auditLead = baseAuditLead({ speedTopIssues: ['slow_server_response'] });
    const progress = buildInitialFixProgress(auditLead, ['speed']);

    expect(progress.slow_server_response).toEqual({
      status: 'pending',
      completedStepIds: [],
      planSource: 'generic',
    });
  });

  it('filters security flags that are not playbook signal keys', () => {
    const auditLead = baseAuditLead({
      securityFlags: ['no_https', 'not_a_real_flag' as 'no_https'],
    });
    const progress = buildInitialFixProgress(auditLead, ['security']);

    expect(Object.keys(progress)).toEqual(['no_https']);
  });
});

describe('shouldSeedFixSessionAdminFields', () => {
  it('returns true when session doc is missing', () => {
    expect(shouldSeedFixSessionAdminFields(undefined)).toBe(true);
  });

  it('returns true when stage is absent', () => {
    expect(shouldSeedFixSessionAdminFields({ orderId: 'ord_1' })).toBe(true);
  });

  it('returns false when stage is already set (idempotent webhook)', () => {
    expect(shouldSeedFixSessionAdminFields({ stage: 'in_progress' })).toBe(false);
  });
});

describe('client dashboard type compatibility', () => {
  it('accepts FixSessionDoc with new admin fields alongside client FixSession', () => {
    const adminDoc: FixSessionDoc = {
      orderId: 'ord_123',
      stage: 'in_progress',
      phase0Complete: false,
      fixProgress: {
        oversized_images: {
          status: 'pending',
          completedStepIds: [],
          planSource: 'generic',
        },
      },
      qa: {
        perPillar: { speed: 'not_started' },
      },
      report: { status: 'not_generated' },
      auditLeadId: 'audit_123',
    };

    const clientSession: FixSession = {
      orderId: adminDoc.orderId ?? null,
      accessStatus: 'needed',
      deliveryStatus: 'in_progress',
      estimatedCompletionAt: null,
      reportUrl: null,
      loomUrl: null,
      googleReviewUrl: null,
      onboarding: null,
      fixProgress: {
        speed: {
          status: 'queued',
          description: null,
          updatedAt: null,
          completedAt: null,
        },
        security: {
          status: 'queued',
          description: null,
          updatedAt: null,
          completedAt: null,
        },
        seo: {
          status: 'queued',
          description: null,
          updatedAt: null,
          completedAt: null,
        },
      },
    };

    expect(adminDoc.stage).toBe('in_progress');
    expect(clientSession.orderId).toBe('ord_123');
  });

  it('accepts legacy FixSessionDoc without new admin fields', () => {
    const legacyDoc: FixSessionDoc = {
      orderId: 'ord_legacy',
      deliveryStatus: 'in_progress',
    };

    const clientSession: FixSession = {
      orderId: legacyDoc.orderId ?? null,
      accessStatus: null,
      deliveryStatus: legacyDoc.deliveryStatus ?? null,
      estimatedCompletionAt: null,
      reportUrl: null,
      loomUrl: null,
      googleReviewUrl: null,
      onboarding: null,
      fixProgress: {
        speed: { status: 'queued', description: null, updatedAt: null, completedAt: null },
        security: { status: 'queued', description: null, updatedAt: null, completedAt: null },
        seo: { status: 'queued', description: null, updatedAt: null, completedAt: null },
      },
    };

    expect(legacyDoc.stage).toBeUndefined();
    expect(clientSession.deliveryStatus).toBe('in_progress');
  });
});

describe('deriveNextAction', () => {
  it('awaiting_access → correct string', () => {
    expect(deriveNextAction('awaiting_access', 5, 0)).toBe(
      'Waiting on customer access'
    );
  });

  it('ready → correct string', () => {
    expect(deriveNextAction('ready', 5, 0)).toBe('Start Phase 0');
  });

  it('in_progress → N of M format', () => {
    expect(deriveNextAction('in_progress', 7, 3)).toBe('4 of 7 signals remaining');
  });

  it('in_progress with zero signals → 0 of 0 signals remaining', () => {
    expect(deriveNextAction('in_progress', 0, 0)).toBe('0 of 0 signals remaining');
  });

  it('qa → correct string', () => {
    expect(deriveNextAction('qa', 4, 4)).toBe('Complete QA checklist');
  });

  it('report_ready → correct string', () => {
    expect(deriveNextAction('report_ready', 4, 4)).toBe('Generate & send report');
  });

  it('delivered → em dash', () => {
    expect(deriveNextAction('delivered', 4, 4)).toBe('—');
  });
});
