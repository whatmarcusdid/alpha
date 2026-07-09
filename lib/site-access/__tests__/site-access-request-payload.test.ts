import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { assertFixJobDetailPayloadSanitized } from '@/lib/fix-jobs/job-detail-server-utils';
import { serializeSiteAccessRequest } from '@/lib/site-access/load-latest-site-access-request';
import type { SiteAccessRequestDoc } from '@/lib/types/site-access-request';

describe('siteAccessRequest payload sanitization', () => {
  it('siteAccessRequest payload contains no tokenHash field', () => {
    const doc: SiteAccessRequestDoc = {
      requestId: 'req_1',
      clientUid: 'user_1',
      sessionId: 'session_1',
      requestedAt: Timestamp.fromDate(new Date('2026-07-08T12:00:00.000Z')),
      requestedBy: 'admin_1',
      requestedByEmail: 'admin@example.com',
      accessType: 'wp_admin',
      scopeDescription: 'Submitted WordPress admin login expired mid-job.',
      expiryDays: 7,
      expiresAt: null,
      status: 'pending',
      grantedAt: null,
      revokedAt: null,
      tokenHash: 'abc123hashshouldneverleak',
      tokenUsed: false,
    };

    const payload = serializeSiteAccessRequest(doc);

    expect(payload).not.toHaveProperty('tokenHash');
    expect(payload).not.toHaveProperty('tokenUsed');
    expect(JSON.stringify(payload)).not.toContain('tokenHash');

    const sanitized = assertFixJobDetailPayloadSanitized({
      sessionId: 'session_1',
      uid: 'user_1',
      stage: 'in_progress',
      stageHistory: [],
      phase0Complete: true,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      businessName: 'Jane Co',
      siteUrl: 'https://example.com',
      entitlements: ['security'],
      auditLeadId: 'audit_1',
      orderId: 'order_1',
      baseline: {
        speedGrade: 'C',
        speedTopIssues: [],
        securityGrade: 'D',
        securityFlags: [],
        seoGrade: 'B',
        seoFailingSignals: [],
      },
      fixProgress: {},
      qa: null,
      qaData: null,
      afterAudit: null,
      report: null,
      reportData: null,
      updatedAt: new Date().toISOString(),
      recentUpdates: [],
      siteAccessRequest: payload,
      hostingContext: {
        host: '',
        cms: '',
        plugins: [],
        isConfirmed: false,
      },
    });

    expect(sanitized.siteAccessRequest?.requestId).toBe('req_1');
    expect(JSON.stringify(sanitized)).not.toContain('tokenHash');
  });
});
