import { Timestamp } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadReportPDF, generateSiteFixPDF } = vi.hoisted(() => ({
  uploadReportPDF: vi.fn(),
  generateSiteFixPDF: vi.fn(),
}));

vi.mock('@/lib/pdf/generateSiteFixPDF', () => ({
  generateSiteFixPDF,
}));

vi.mock('@/lib/storage/adminStorage', () => ({
  uploadReportPDF,
  reportStoragePath: (uid: string, sessionId: string, reportId: string) =>
    `reports/${uid}/${sessionId}/${reportId}.pdf`,
}));

let sessionDoc: Record<string, unknown>;
let userDoc: Record<string, unknown>;
let auditLeadDoc: Record<string, unknown>;
const sessionUpdate = vi.fn();
const generatedReportId = 'report_new_1';

vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase-admin/firestore')>(
    'firebase-admin/firestore'
  );

  return {
    ...actual,
    FieldValue: {
      serverTimestamp: () => ({ __type: 'serverTimestamp' }),
    },
  };
});

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === '_') {
        return { doc: () => ({ id: generatedReportId }) };
      }

      if (name === 'auditLeads') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => auditLeadDoc }),
          }),
        };
      }

      if (name === 'users') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => userDoc }),
            collection: () => ({
              doc: () => ({
                get: async () => ({ exists: true, data: () => sessionDoc }),
                update: sessionUpdate,
              }),
            }),
          }),
        };
      }

      return { doc: vi.fn() };
    },
  },
}));

import { generateSiteFixReport } from '@/lib/fix-jobs/generate-site-fix-report';

beforeEach(() => {
  vi.clearAllMocks();
  generateSiteFixPDF.mockResolvedValue(Buffer.from('pdf-content'));
  uploadReportPDF.mockResolvedValue(undefined);

  sessionDoc = {
    stage: 'report_ready',
    auditLeadId: 'audit_1',
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
    report: { status: 'not_generated' },
  };

  userDoc = {
    fullName: 'Jane Doe',
    company: { legalName: 'Jane Co' },
    siteFix: { entitlements: ['security'] },
  };

  auditLeadDoc = {
    auditLeadId: 'audit_1',
    businessName: 'Jane Co',
    websiteUrl: 'https://example.com',
    securityGrade: 'D',
    securityFlags: ['no_https'],
    speedGrade: 'C',
    speedTopIssues: [],
    seoGrade: 'B',
    seoFailingSignals: [],
  };
});

describe('generateSiteFixReport', () => {
  it('generate outside report_ready → 409', async () => {
    sessionDoc.stage = 'qa';

    const result = await generateSiteFixReport({
      uid: 'user_1',
      sessionId: 's1',
    });

    expect(result).toEqual({
      status: 409,
      error: 'Job is not in report_ready stage',
    });
  });

  it('generate after sent → 409 (immutable history)', async () => {
    sessionDoc.report = { status: 'sent', reportId: 'old_report' };

    const result = await generateSiteFixReport({
      uid: 'user_1',
      sessionId: 's1',
    });

    expect(result).toEqual({
      status: 409,
      error: 'Cannot regenerate: report has already been sent',
    });
  });

  it('deliveryNote > 500 chars → 400', async () => {
    const result = await generateSiteFixReport({
      uid: 'user_1',
      sessionId: 's1',
      deliveryNote: 'a'.repeat(501),
    });

    expect(result).toEqual({
      status: 400,
      error: 'Delivery note must be 500 characters or fewer',
    });
  });

  it('deliveryNote with denylist term → 400 naming term', async () => {
    const result = await generateSiteFixReport({
      uid: 'user_1',
      sessionId: 's1',
      deliveryNote: 'We used WP Rocket for caching',
    });

    expect('status' in result && result.status).toBe(400);
    if ('error' in result) {
      expect(result.error).toContain('WP Rocket');
    }
  });

  it('valid generate: PDF stored at correct path, session updated', async () => {
    const result = await generateSiteFixReport({
      uid: 'user_1',
      sessionId: 's1',
    });

    expect(result).toEqual({ reportId: generatedReportId });
    expect(uploadReportPDF).toHaveBeenCalledWith(
      'user_1',
      's1',
      generatedReportId,
      expect.any(Buffer)
    );
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'report.status': 'generated',
        'report.reportId': generatedReportId,
      })
    );
  });

  it('regenerate when status is "generated" → overwrites, new reportId', async () => {
    sessionDoc.report = { status: 'generated', reportId: 'old_report' };

    const result = await generateSiteFixReport({
      uid: 'user_1',
      sessionId: 's1',
    });

    expect(result).toEqual({ reportId: generatedReportId });
    expect(uploadReportPDF).toHaveBeenCalledWith(
      'user_1',
      's1',
      generatedReportId,
      expect.any(Buffer)
    );
  });
});
