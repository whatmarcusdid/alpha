import { describe, expect, it } from 'vitest';

import { SECURITY_FLAG_DISPLAY_NAMES } from '@/lib/audit/securityFlagDisplayNames';
import { SPEED_ISSUE_DISPLAY_NAMES } from '@/lib/audit/speedTopIssues';
import type { AuditReportData } from '@/lib/pdf/AuditReportDocument';
import { generateAuditPDF } from '@/lib/pdf/generateAuditPDF';
import { extractPdfText } from '@/lib/pdf/generateSiteFixPDF';

const sampleAuditData: AuditReportData = {
  businessName: 'Crystal Clear Pressure Washing',
  websiteUrl: 'https://example.com',
  auditDate: 'July 19, 2026',
  speedGrade: 'F',
  speedScore: 42,
  speedTopIssues: ['render_blocking_resources', 'oversized_images'],
  speedNarrative: 'Your site scored 42/100 for speed. Grade: F.',
  securityGrade: 'B',
  securityFlags: ['mixed_content'],
  securityFlagTier: 'advisory',
  securityNarrative: 'Your site received a Security grade of B.',
  seoGrade: 'D',
  seoScore: 2,
  seoFailingSignals: ['weak_title_tag', 'missing_meta_description'],
  seoNarrative: 'SEO narrative for sample audit.',
  pricingUrl: 'https://tradesitegenie.com/pricing',
};

const partialFailedSpeedData: AuditReportData = {
  ...sampleAuditData,
  speedGrade: 'N/A',
  speedScore: 0,
  speedTopIssues: [],
  speedNarrative:
    "We weren't able to check your site speed this time. Your Security and SEO & AI Visibility results are still shown below.",
};

const longNamesAuditData: AuditReportData = {
  ...sampleAuditData,
  businessName:
    'Crystal Clear Pressure Washing and Exterior Cleaning Services of Greater Metropolitan Springfield LLC',
  websiteUrl:
    'https://pressure-wash-site-with-a-very-long-subdomain-name--whitem0824.replit.app',
};

function resolveSpeedIssueLabel(issueKey: string): string {
  return (
    SPEED_ISSUE_DISPLAY_NAMES[
      issueKey as keyof typeof SPEED_ISSUE_DISPLAY_NAMES
    ] ?? issueKey
  );
}

function resolveSecurityFlagLabel(flag: keyof typeof SECURITY_FLAG_DISPLAY_NAMES): string {
  return SECURITY_FLAG_DISPLAY_NAMES[flag] ?? flag;
}

describe('generateAuditPDF', () => {
  it('maps speed and security codes to the same labels as AuditResults', () => {
    expect(resolveSpeedIssueLabel('render_blocking_resources')).toBe(
      'Render-blocking scripts are slowing page load'
    );
    expect(resolveSpeedIssueLabel('oversized_images')).toBe(
      'Images are too large and unoptimized'
    );
    expect(resolveSecurityFlagLabel('mixed_content')).toBe(
      'Mixed HTTP and HTTPS content detected'
    );
    expect(resolveSpeedIssueLabel('unknown_issue')).toBe('unknown_issue');
  });

  it('produces a valid PDF buffer with resolved issue labels in the payload', async () => {
    const buffer = await generateAuditPDF(sampleAuditData);
    const text = extractPdfText(buffer);

    expect(text.startsWith('%PDF-')).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(500);
    expect(sampleAuditData.speedTopIssues.map(resolveSpeedIssueLabel)).toEqual([
      SPEED_ISSUE_DISPLAY_NAMES.render_blocking_resources,
      SPEED_ISSUE_DISPLAY_NAMES.oversized_images,
    ]);
    expect(
      sampleAuditData.securityFlags.map(resolveSecurityFlagLabel)
    ).toEqual([SECURITY_FLAG_DISPLAY_NAMES.mixed_content]);
  });

  it('renders without error when speed pillar grade is N/A (failed scan)', async () => {
    const buffer = await generateAuditPDF(partialFailedSpeedData);

    expect(buffer.byteLength).toBeGreaterThan(500);
    expect(partialFailedSpeedData.speedGrade).toBe('N/A');
    expect(partialFailedSpeedData.speedTopIssues).toHaveLength(0);
  });

  it('generates a valid PDF with long businessName and websiteUrl', async () => {
    const buffer = await generateAuditPDF(longNamesAuditData);

    expect(buffer.byteLength).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.subarray(buffer.length - 6).toString()).toContain('EOF');
  });
});
