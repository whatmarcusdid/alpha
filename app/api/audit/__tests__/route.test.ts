import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  applyRateLimit,
  checkEmailRateLimit,
  runAuditPipeline,
  getSEONarrative,
  getAuditNarratives,
  generateAuditPDF,
  sendAuditReportEmail,
  sendAuditLeadNotification,
  createAuditLeadRecord,
} = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  checkEmailRateLimit: vi.fn(),
  runAuditPipeline: vi.fn(),
  getSEONarrative: vi.fn(),
  getAuditNarratives: vi.fn(),
  generateAuditPDF: vi.fn(),
  sendAuditReportEmail: vi.fn(),
  sendAuditLeadNotification: vi.fn(),
  createAuditLeadRecord: vi.fn(),
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  auditRateLimiter: {},
  applyRateLimit,
  getClientIdentifier: () => '127.0.0.1',
  getRateLimitHeaders: () => ({}),
}));

vi.mock('@/lib/audit/rateLimit', () => ({
  checkEmailRateLimit,
}));

vi.mock('@/lib/audit/runAuditPipeline', () => ({
  runAuditPipeline,
}));

vi.mock('@/lib/audit/gemini', () => ({
  getSEONarrative,
  getAuditNarratives,
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: null,
}));

vi.mock('@/lib/pdf/generateAuditPDF', () => ({
  generateAuditPDF,
}));

vi.mock('@/lib/loops', () => ({
  sendAuditReportEmail,
}));

vi.mock('@/lib/slack', () => ({
  sendAuditLeadNotification,
}));

vi.mock('@/lib/notion', () => ({
  createAuditLeadRecord,
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'snapshot-audit-lead-id',
}));

import { POST } from '@/app/api/audit/route';

const validBody = {
  firstName: 'Jane',
  businessName: 'Jane Co',
  email: 'jane@example.com',
  websiteUrl: 'https://example.com',
  isClient: true,
};

function makeRequest(body: unknown = validBody): NextRequest {
  return new NextRequest('http://localhost:3000/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const completedPipeline = {
  speed: {
    status: 'completed' as const,
    data: { grade: 'B', score: 82, topIssues: ['lcp_slow'] },
  },
  security: {
    status: 'completed' as const,
    data: { grade: 'A', flags: [], flagTier: 'none' },
  },
  seo: {
    status: 'completed' as const,
    data: {
      grade: 'C',
      score: 68,
      failingSignals: ['missing_meta_description'],
    },
  },
};

const partialPipeline = {
  speed: {
    status: 'failed' as const,
    error: 'PageSpeed unavailable',
  },
  security: {
    status: 'completed' as const,
    data: { grade: 'D', flags: ['no_https'], flagTier: 'advisory' },
  },
  seo: {
    status: 'completed' as const,
    data: {
      grade: 'B',
      score: 80,
      failingSignals: [],
    },
  },
};

describe('POST /api/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
    checkEmailRateLimit.mockResolvedValue(false);
    getSEONarrative.mockResolvedValue('SEO narrative snapshot.');
    getAuditNarratives.mockResolvedValue({
      speed: 'Speed narrative snapshot.',
      security: 'Security narrative snapshot.',
    });
    generateAuditPDF.mockResolvedValue(Buffer.from('pdf'));
  });

  it('POST /api/audit response shape unchanged for completed audit (snapshot)', async () => {
    runAuditPipeline.mockResolvedValue(completedPipeline);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "auditLeadId": "snapshot-audit-lead-id",
          "auditStatus": "completed",
          "firstName": "Jane",
          "security": {
            "flagTier": "none",
            "flags": [],
            "grade": "A",
            "narrative": "Security narrative snapshot.",
            "status": "completed",
          },
          "seo": {
            "failingSignals": [
              "missing_meta_description",
            ],
            "grade": "C",
            "narrative": "SEO narrative snapshot.",
            "score": 68,
            "status": "completed",
          },
          "speed": {
            "grade": "B",
            "narrative": "Speed narrative snapshot.",
            "score": 82,
            "status": "completed",
            "topIssues": [
              "lcp_slow",
            ],
          },
          "websiteUrl": "https://example.com",
        },
        "success": true,
      }
    `);
  });

  it('POST /api/audit response shape unchanged for partial audit (snapshot)', async () => {
    runAuditPipeline.mockResolvedValue(partialPipeline);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchInlineSnapshot(`
      {
        "data": {
          "auditLeadId": "snapshot-audit-lead-id",
          "auditStatus": "partial",
          "firstName": "Jane",
          "security": {
            "flagTier": "advisory",
            "flags": [
              "no_https",
            ],
            "grade": "D",
            "narrative": "Security narrative snapshot.",
            "status": "completed",
          },
          "seo": {
            "failingSignals": [],
            "grade": "B",
            "narrative": "SEO narrative snapshot.",
            "score": 80,
            "status": "completed",
          },
          "speed": {
            "grade": "N/A",
            "narrative": "We weren't able to check your site speed this time. Your Security and SEO & AI Visibility results are still shown below.",
            "score": 0,
            "status": "failed",
            "topIssues": [],
          },
          "websiteUrl": "https://example.com",
        },
        "success": true,
      }
    `);
  });
});
