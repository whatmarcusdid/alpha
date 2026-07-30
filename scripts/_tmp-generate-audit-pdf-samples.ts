/**
 * One-off: write audit PDF samples for visual review. Safe to delete after use.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { FIX_PLAYBOOK } from '../lib/audit/fixPlaybook';
import type { SpeedTopIssueKey } from '../lib/audit/speedTopIssues';
import type { AuditReportData } from '../lib/pdf/AuditReportDocument';
import { generateAuditPDF } from '../lib/pdf/generateAuditPDF';
import type { SecurityFlag } from '../lib/types/audit';
import type { SeoFailingSignalKey } from '../lib/types/seoSignals';

const outDir = path.join(process.cwd(), 'tmp', 'audit-pdf-samples');

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
    businessName: 'Worst Case Demo Co',
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

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });

  const samples: { name: string; data: AuditReportData }[] = [
    { name: 'crystal-clear-pressure-washing', data: crystalClearSample },
    { name: 'worst-case-all-issues', data: worstCaseSample() },
  ];

  for (const sample of samples) {
    const buffer = await generateAuditPDF(sample.data);
    const filePath = path.join(outDir, `${sample.name}.pdf`);
    await writeFile(filePath, buffer);
    console.log('Wrote', filePath, `(${buffer.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
