/**
 * Writes a sample audit PDF to tmp/audit-report-sample.pdf for visual review.
 * Run: npx tsx scripts/generate-audit-pdf-sample.ts
 * Long names: npx tsx scripts/generate-audit-pdf-sample.ts --long-names
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AuditReportData } from '@/lib/pdf/AuditReportDocument';
import { generateAuditPDF } from '@/lib/pdf/generateAuditPDF';

const sampleData: AuditReportData = {
  businessName: 'Crystal Clear Pressure Washing',
  websiteUrl: 'https://pressure-wash-site--example.replit.app',
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
  seoNarrative: 'Your SEO visibility needs work on titles and meta descriptions.',
  pricingUrl: 'https://tradesitegenie.com/pricing',
};

const longNamesData: AuditReportData = {
  ...sampleData,
  businessName:
    'Crystal Clear Pressure Washing and Exterior Cleaning Services of Greater Metropolitan Springfield LLC',
  websiteUrl:
    'https://pressure-wash-site-with-a-very-long-subdomain-name--whitem0824.replit.app',
};

const useLongNames = process.argv.includes('--long-names');
const data = useLongNames ? longNamesData : sampleData;

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'tmp');
const outPath = join(
  outDir,
  useLongNames ? 'audit-report-long-names-sample.pdf' : 'audit-report-sample.pdf'
);

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const buffer = await generateAuditPDF(data);
  writeFileSync(outPath, buffer);
  console.log(`Sample audit PDF written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
