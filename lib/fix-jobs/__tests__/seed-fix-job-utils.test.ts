import { describe, expect, it, vi } from 'vitest';

import { buildInitialFixProgress } from '@/lib/fix-jobs/helpers';
import {
  assertNotProductionProject,
  buildSeedAuditLeadDoc,
  filterAuditSignalsForEntitlements,
  parseSeedCliArgs,
  PRODUCTION_PROJECT_IDS,
} from '@/lib/fix-jobs/seed-fix-job-utils';

describe('seed-fix-job utils', () => {
  it('production guard fires on a fake prod project ID', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as typeof process.exit);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertNotProductionProject('tradesitegenie-prod')).toThrow('exit');
    expect(error).toHaveBeenCalledWith(
      '❌ Refusing to seed: connected to production project',
      'tradesitegenie-prod'
    );

    exit.mockRestore();
    error.mockRestore();
  });

  it('production guard allows non-production project IDs', () => {
    expect(() => assertNotProductionProject('tradesitegenie-dev')).not.toThrow();
    expect(PRODUCTION_PROJECT_IDS).toContain('tradesitegenie-prod');
  });

  it('parseSeedCliArgs defaults to full without --with-access', () => {
    expect(parseSeedCliArgs([])).toEqual({
      pillars: 'full',
      withAccess: false,
    });
  });

  it('parseSeedCliArgs reads --pillars speed and --with-access', () => {
    expect(parseSeedCliArgs(['--pillars=speed', '--with-access'])).toEqual({
      pillars: 'speed',
      withAccess: true,
    });
  });

  it('--pillars speed produces only speed signals in audit lead and fixProgress', () => {
    const entitlements = ['speed'] as const;
    const auditLead = buildSeedAuditLeadDoc({
      auditLeadId: 'audit_1',
      email: 'seed@test.dev',
      entitlements: [...entitlements],
    });

    expect(auditLead.speedTopIssues.length).toBeGreaterThan(0);
    expect(auditLead.securityFlags).toEqual([]);
    expect(auditLead.seoFailingSignals).toEqual([]);

    const progress = buildInitialFixProgress(auditLead, [...entitlements]);
    expect(Object.keys(progress).length).toBeGreaterThan(0);
    expect(progress.oversized_images).toEqual({
      status: 'pending',
      completedStepIds: [],
      planSource: 'generic',
    });
    expect(progress.blacklisted).toBeUndefined();
    expect(progress.missing_title_tag).toBeUndefined();
  });

  it('filterAuditSignalsForEntitlements scopes security-only jobs', () => {
    const signals = filterAuditSignalsForEntitlements(['security']);
    expect(signals.speedTopIssues).toEqual([]);
    expect(signals.securityFlags).toEqual(['blacklisted', 'missing_security_headers']);
    expect(signals.seoFailingSignals).toEqual([]);
  });
});
