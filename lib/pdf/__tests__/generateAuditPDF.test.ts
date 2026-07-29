import { describe, expect, it } from 'vitest';

import type { SpeedTopIssueKey } from '@/lib/audit/speedTopIssues';
import { FIX_PLAYBOOK } from '@/lib/audit/fixPlaybook';
import type { SecurityFlag } from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';

import {
  getIssueDisplay,
  severityDotColor,
} from '../auditReportIssueDisplay';
import { generateAuditPDF } from '../generateAuditPDF';
import type { AuditReportData } from '../AuditReportDocument';

function countPdfPages(buffer: Buffer): number {
  const text = buffer.toString('latin1');
  return (text.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

/** US Letter MediaBox in PDF points: 612 × 792 */
function extractPageMediaBoxes(buffer: Buffer): string[] {
  const text = buffer.toString('latin1');
  return [...text.matchAll(/\/MediaBox\s*\[\s*([^\]]+)\]/g)].map((m) =>
    m[1].replace(/\s+/g, ' ').trim()
  );
}

function expectAllPagesLetterSize(buffer: Buffer): void {
  const boxes = extractPageMediaBoxes(buffer);
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  for (const box of boxes) {
    expect(box).toBe('0 0 612 792');
  }
}

const crystalClearSample: AuditReportData = {
  firstName: 'Marcus',
  businessName: 'Crystal Clear Pressure Washing',
  websiteUrl: 'https://pressure-wash-site--whitem0824.replit.app/',
  auditDate: 'July 28, 2026',
  speedGrade: 'N/A',
  speedScore: 0,
  speedTopIssues: [],
  speedNarrative:
    "We weren't able to check your site speed this time. Your Security and SEO & AI Visibility results are still shown below.",
  securityGrade: 'A',
  securityFlags: [],
  securityFlagTier: 'none',
  securityNarrative: 'Your site received a Security grade of A.',
  seoGrade: 'D',
  seoScore: 2,
  seoFailingSignals: [
    'missing_title_tag',
    'weak_meta_description',
    'missing_h1',
    'thin_service_content',
    'weak_location_specificity',
    'no_schema',
    'not_indexable',
  ],
  seoNarrative:
    "We weren't able to complete your SEO & AI Visibility check this time. Your Speed and Security results are still shown below.",
  pricingUrl: 'https://my.bookservice.tech/book-service/select',
};

function worstCaseSample(): AuditReportData {
  const speedKeys = Object.values(FIX_PLAYBOOK)
    .filter((e) => e.pillar === 'speed')
    .map((e) => e.signalKey as SpeedTopIssueKey);
  const securityKeys = Object.values(FIX_PLAYBOOK)
    .filter((e) => e.pillar === 'security')
    .map((e) => e.signalKey as SecurityFlag);
  const seoKeys = Object.values(FIX_PLAYBOOK)
    .filter((e) => e.pillar === 'seo_ai_visibility')
    .map((e) => e.signalKey as SeoFailingSignalKey);

  return {
    ...crystalClearSample,
    speedGrade: 'D',
    speedScore: 42,
    speedTopIssues: speedKeys,
    speedNarrative:
      'Your site scored 42/100 for speed. Several performance issues are slowing down first impressions for visitors.',
    securityGrade: 'F',
    securityFlags: securityKeys,
    securityFlagTier: 'tier1',
    securityNarrative:
      'Your site received a Security grade of F. Critical security issues need immediate attention.',
    seoGrade: 'F',
    seoScore: 0,
    seoFailingSignals: seoKeys,
    seoNarrative:
      'Search engines and AI assistants may struggle to understand and trust this site.',
  };
}

describe('auditReportIssueDisplay', () => {
  it('maps speed keys to playbook title and severity', () => {
    const issue = getIssueDisplay('render_blocking_resources');
    expect(issue.label).toBe(
      'Render-blocking scripts are slowing page load'
    );
    expect(issue.severity).toBe('high');
    expect(severityDotColor(issue.severity)).toBe('#e7000b');
  });

  it('maps moderate severity to amber dot color', () => {
    expect(severityDotColor('moderate')).toBe('#f0b100');
  });
});

describe('generateAuditPDF', () => {
  it('renders exactly two pages for the Crystal Clear sample', async () => {
    const buffer = await generateAuditPDF(crystalClearSample);
    expect(buffer.length).toBeGreaterThan(0);
    expect(countPdfPages(buffer)).toBe(2);
    expectAllPagesLetterSize(buffer);
  });

  it('does not leak raw issue keys in PDF bytes for worst-case content', async () => {
    const buffer = await generateAuditPDF(worstCaseSample());
    const text = buffer.toString('latin1');
    expect(text.includes('render_blocking_resources')).toBe(false);
    expect(text.includes('missing_title_tag')).toBe(false);
    expect(text.includes('malware_detected')).toBe(false);
    expect(countPdfPages(buffer)).toBe(2);
  });

  it('does not include tradesitegenie.com branding', async () => {
    const buffer = await generateAuditPDF(crystalClearSample);
    const text = buffer.toString('latin1').toLowerCase();
    expect(text.includes('tradesitegenie.com')).toBe(false);
    expect(text.includes('my.tradesitegenie.com')).toBe(false);
  });

  it('does not render speed all-clear copy when grade is N/A', async () => {
    const buffer = await generateAuditPDF(crystalClearSample);
    const text = buffer.toString('latin1');
    expect(text.includes('No major speed issues detected')).toBe(false);
  });

  it('does not include the removed CTA back page', async () => {
    const buffer = await generateAuditPDF(crystalClearSample);
    const text = buffer.toString('latin1');
    expect(text.includes("Don't leave these issues sitting")).toBe(false);
    expect(text.includes('View Your Site Fix Options')).toBe(false);
  });
});
