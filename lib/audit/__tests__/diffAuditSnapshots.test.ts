import { describe, expect, it } from 'vitest';

import { diffAuditSnapshots } from '@/lib/audit/diffAuditSnapshots';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { AfterAuditPillars } from '@/lib/audit/diffAuditSnapshots';

function baseline(overrides: Partial<AuditLeadDoc> = {}): AuditLeadDoc {
  return {
    auditLeadId: 'audit_1',
    speedGrade: 'F',
    speedTopIssues: ['lcp_slow', 'cls_high'],
    securityGrade: 'D',
    securityFlags: ['no_https', 'missing_security_headers'],
    seoGrade: 'C',
    seoFailingSignals: ['missing_title', 'missing_meta_description'],
    ...overrides,
  } as AuditLeadDoc;
}

function afterSnapshot(overrides: AfterAuditPillars = {}): AfterAuditPillars {
  return {
    speed: {
      grade: 'B',
      score: 85,
      topIssues: ['cls_high'],
      status: 'completed',
    },
    security: {
      grade: 'A',
      flags: [],
      flagTier: 'none',
      status: 'completed',
    },
    seo: {
      grade: 'B',
      score: 80,
      failingSignals: ['missing_meta_description'],
      status: 'completed',
    },
    ...overrides,
  };
}

const allEntitlements = ['speed', 'security', 'seo_ai_visibility'] as const;

describe('diffAuditSnapshots', () => {
  it('resolved: signal in baseline but not in after', () => {
    const diff = diffAuditSnapshots(
      baseline(),
      afterSnapshot(),
      [...allEntitlements]
    );

    expect(diff.speed?.resolved).toEqual(['lcp_slow']);
    expect(diff.security?.resolved).toEqual(['no_https', 'missing_security_headers']);
    expect(diff.seo?.resolved).toEqual(['missing_title']);
  });

  it('remaining: signal in both baseline and after', () => {
    const diff = diffAuditSnapshots(
      baseline(),
      afterSnapshot(),
      [...allEntitlements]
    );

    expect(diff.speed?.remaining).toEqual(['cls_high']);
    expect(diff.seo?.remaining).toEqual(['missing_meta_description']);
  });

  it('introduced: signal in after but not in baseline', () => {
    const diff = diffAuditSnapshots(
      baseline(),
      afterSnapshot({
        speed: {
          grade: 'B',
          score: 85,
          topIssues: ['cls_high', 'ttfb_slow'],
          status: 'completed',
        },
      }),
      [...allEntitlements]
    );

    expect(diff.speed?.introduced).toEqual(['ttfb_slow']);
  });

  it('improved: grade A after vs F before → improved: true', () => {
    const diff = diffAuditSnapshots(
      baseline({ speedGrade: 'F' }),
      afterSnapshot({
        speed: {
          grade: 'A',
          score: 95,
          topIssues: [],
          status: 'completed',
        },
      }),
      ['speed']
    );

    expect(diff.speed?.improved).toBe(true);
  });

  it('not improved: same grade → improved: false', () => {
    const diff = diffAuditSnapshots(
      baseline({ speedGrade: 'C' }),
      afterSnapshot({
        speed: {
          grade: 'C',
          score: 70,
          topIssues: ['lcp_slow'],
          status: 'completed',
        },
      }),
      ['speed']
    );

    expect(diff.speed?.improved).toBe(false);
  });

  it('regressed: grade F after vs A before → improved: false', () => {
    const diff = diffAuditSnapshots(
      baseline({ speedGrade: 'A' }),
      afterSnapshot({
        speed: {
          grade: 'F',
          score: 30,
          topIssues: ['lcp_slow'],
          status: 'completed',
        },
      }),
      ['speed']
    );

    expect(diff.speed?.improved).toBe(false);
  });

  it('zero failing signals in baseline: resolved/remaining/introduced all empty', () => {
    const diff = diffAuditSnapshots(
      baseline({ speedTopIssues: [] }),
      afterSnapshot({
        speed: {
          grade: 'A',
          score: 95,
          topIssues: [],
          status: 'completed',
        },
      }),
      ['speed']
    );

    expect(diff.speed?.resolved).toEqual([]);
    expect(diff.speed?.remaining).toEqual([]);
    expect(diff.speed?.introduced).toEqual([]);
  });

  it('failed after pillar: status "failed", gradeAfter "N/A", improved false', () => {
    const diff = diffAuditSnapshots(
      baseline({ speedGrade: 'D' }),
      afterSnapshot({
        speed: {
          grade: 'F',
          score: 0,
          topIssues: [],
          status: 'failed',
        },
      }),
      ['speed']
    );

    expect(diff.speed?.status).toBe('failed');
    expect(diff.speed?.gradeAfter).toBe('N/A');
    expect(diff.speed?.improved).toBe(false);
  });

  it('not_purchased pillar: omitted from diff', () => {
    const diff = diffAuditSnapshots(baseline(), afterSnapshot(), ['speed']);

    expect(diff.speed).toBeDefined();
    expect(diff.security).toBeUndefined();
    expect(diff.seo).toBeUndefined();
  });
});
