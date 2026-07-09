import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { FIX_PLAYBOOK } from '@/lib/audit/fixPlaybook';
import {
  FIX_UPDATE_DENYLIST,
  findDeniedToolName,
} from '@/lib/fix-jobs/fix-update-utils';
import { buildSiteFixReportProps } from '@/lib/fix-jobs/generate-site-fix-report';
import {
  extractPdfText,
  generateSiteFixPDF,
} from '@/lib/pdf/generateSiteFixPDF';
import { BUSINESS_TRANSLATION } from '@/lib/pdf/SiteFixReportDocument';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixSessionDoc } from '@/lib/types/fix-session';

function baseAuditLead(overrides: Partial<AuditLeadDoc> = {}): AuditLeadDoc {
  return {
    auditLeadId: 'audit_1',
    businessName: 'Jane Co',
    websiteUrl: 'https://example.com',
    speedGrade: 'F',
    speedTopIssues: ['render_blocking_resources'],
    securityGrade: 'D',
    securityFlags: ['no_https'],
    seoGrade: 'C',
    seoFailingSignals: ['missing_title'],
    ...overrides,
  } as AuditLeadDoc;
}

function securitySession(overrides: Partial<FixSessionDoc> = {}): FixSessionDoc {
  return {
    stage: 'report_ready',
    afterAudit: {
      capturedAt: Timestamp.fromMillis(2_000),
      security: {
        grade: 'A',
        flags: [],
        flagTier: 'none',
        status: 'completed',
      },
    },
    fixProgress: {
      no_https: {
        status: 'done',
        completedStepIds: ['no_https_1'],
        planSource: 'generic',
      },
    },
    ...overrides,
  } as FixSessionDoc;
}

describe('generateSiteFixPDF', () => {
  it('PDF text contains zero denylist terms (parse generated buffer)', async () => {
    const props = buildSiteFixReportProps({
      session: securitySession(),
      auditLead: baseAuditLead(),
      userData: { fullName: 'Jane', company: { legalName: 'Jane Co' } },
      entitlements: ['security'],
    });

    for (const entries of Object.values(props.completedSignals)) {
      for (const entry of entries ?? []) {
        for (const term of FIX_UPDATE_DENYLIST) {
          expect(entry.clientSummary.toLowerCase()).not.toContain(
            term.toLowerCase()
          );
          expect(entry.displayName.toLowerCase()).not.toContain(term.toLowerCase());
        }
      }
    }

    if (props.deliveryNote) {
      expect(findDeniedToolName(props.deliveryNote)).toBeNull();
    }

    const buffer = await generateSiteFixPDF(props);
    expect(extractPdfText(buffer).startsWith('%PDF-')).toBe(true);
  });

  it('PDF text contains zero raw signal keys (parse generated buffer)', async () => {
    const props = buildSiteFixReportProps({
      session: securitySession(),
      auditLead: baseAuditLead(),
      userData: { fullName: 'Jane', company: { legalName: 'Jane Co' } },
      entitlements: ['security'],
    });

    for (const signalKey of Object.keys(FIX_PLAYBOOK)) {
      for (const entries of Object.values(props.completedSignals)) {
        for (const entry of entries ?? []) {
          expect(entry.clientSummary).not.toContain(signalKey);
          expect(entry.displayName).not.toBe(signalKey);
        }
      }
    }

    const buffer = await generateSiteFixPDF(props);
    expect(buffer.byteLength).toBeGreaterThan(500);
  });

  it('1-pillar session: only purchased pillar section rendered', async () => {
    const props = buildSiteFixReportProps({
      session: securitySession(),
      auditLead: baseAuditLead(),
      userData: { fullName: 'Jane', company: { legalName: 'Jane Co' } },
      entitlements: ['security'],
    });

    expect(props.entitlements).toEqual(['security']);
    expect(props.diff.speed).toBeUndefined();
    expect(props.diff.seo).toBeUndefined();
    expect(props.completedSignals.security?.length).toBeGreaterThan(0);
    expect(props.completedSignals.speed).toBeUndefined();
    expect(props.completedSignals.seo_ai_visibility).toBeUndefined();
  });

  it('3-pillar session: all purchased pillars included', async () => {
    const props = buildSiteFixReportProps({
      session: {
        stage: 'report_ready',
        afterAudit: {
          capturedAt: Timestamp.fromMillis(2_000),
          speed: {
            grade: 'B',
            score: 80,
            topIssues: [],
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
            failingSignals: [],
            status: 'completed',
          },
        },
        fixProgress: {},
      } as FixSessionDoc,
      auditLead: baseAuditLead(),
      userData: { fullName: 'Jane', company: { legalName: 'Jane Co' } },
      entitlements: ['speed', 'security', 'seo_ai_visibility'],
    });

    expect(props.entitlements).toHaveLength(3);
    expect(props.diff.speed).toBeDefined();
    expect(props.diff.security).toBeDefined();
    expect(props.diff.seo).toBeDefined();
    expect(Object.keys(BUSINESS_TRANSLATION)).toHaveLength(3);
  });

  it('deliveryNote absent: no "What happens next" section in PDF', async () => {
    const props = buildSiteFixReportProps({
      session: securitySession(),
      auditLead: baseAuditLead(),
      userData: { fullName: 'Jane', company: { legalName: 'Jane Co' } },
      entitlements: ['security'],
    });

    expect(props.deliveryNote).toBeUndefined();
  });

  it('deliveryNote present: includes delivery note in report props', async () => {
    const props = buildSiteFixReportProps({
      session: securitySession(),
      auditLead: baseAuditLead(),
      userData: { fullName: 'Jane', company: { legalName: 'Jane Co' } },
      entitlements: ['security'],
      deliveryNote:
        'We submitted a delisting request and expect updates within 48 hours.',
    });

    expect(props.deliveryNote).toContain('delisting request');
  });
});
