import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';
import type { SpeedTopIssueKey } from '@/lib/audit/speedTopIssues';

export type { SpeedTopIssueKey } from '@/lib/audit/speedTopIssues';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export type ClientGrade = Grade | 'N/A';

export type SecurityFlag =
  | 'malware_detected'
  | 'blacklisted'
  | 'phishing_detected'
  | 'unwanted_software_detected'
  | 'no_https'
  | 'invalid_ssl'
  | 'missing_security_headers'
  | 'outdated_cms'
  | 'http_redirect_missing'
  | 'mixed_content';

export type SecurityFlagTier = 'none' | 'advisory' | 'tier2' | 'tier1';

export const TIER1_FLAGS = new Set<SecurityFlag>([
  'malware_detected',
  'blacklisted',
  'phishing_detected',
  'unwanted_software_detected',
  'no_https',
]);

export const TIER2_FLAGS = new Set<SecurityFlag>([
  'invalid_ssl',
]);

export const SECURITY_FLAG_DISPLAY_NAMES: Record<SecurityFlag, string> = {
  malware_detected: 'Malware detected on your site',
  blacklisted: 'Site appears on a security blacklist',
  phishing_detected: 'Phishing content detected',
  unwanted_software_detected: 'Unwanted software detected',
  no_https: 'Site is not using HTTPS',
  invalid_ssl: 'SSL certificate is invalid or expired',
  missing_security_headers: 'Missing security headers (X-Frame-Options, CSP)',
  outdated_cms: 'Outdated CMS or plugins detected',
  http_redirect_missing: 'HTTP to HTTPS redirect is missing',
  mixed_content: 'Mixed HTTP/HTTPS content detected',
};

export type AuditInput = {
  firstName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  isClient?: boolean;
};

export const AuditInputSchema = z.object({
  firstName: z.string().min(1).max(64),
  businessName: z.string().min(1).max(128),
  email: z.string().email(),
  websiteUrl: z.string().url().max(512),
  isClient: z.boolean().optional().default(false),
});

export type AuditLeadDoc = {
  // Identity
  auditLeadId: string;
  firstName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  source: 'public_audit';
  schemaVersion: 'v2';

  // Audit metadata
  timestamp: Timestamp;
  auditStatus: 'completed' | 'partial';

  // Speed
  speedGrade: Grade;
  speedScore: number;
  speedTopIssues: SpeedTopIssueKey[];
  speedNarrative: string;
  speedStatus: 'completed' | 'failed';

  // Security
  securityGrade: Grade;
  securityFlags: SecurityFlag[];
  securityFlagTier: SecurityFlagTier;
  securityNarrative: string;
  securityStatus: 'completed' | 'failed';

  // SEO
  seoGrade: Grade;
  seoScore: number;
  seoFailingSignals: SeoFailingSignalKey[];
  seoNarrative: string;
  seoStatus: 'completed' | 'failed';

  // Downstream linkage
  orderId?: string;
  claimedByUserId?: string;
};

export type AuditResult = {
  auditLeadId: string;
  firstName: string;
  websiteUrl: string;
  auditStatus: 'completed' | 'partial';

  speed: {
    grade: ClientGrade;
    score: number;
    topIssues: SpeedTopIssueKey[];
    narrative: string;
    status: 'completed' | 'failed';
  };

  security: {
    grade: ClientGrade;
    flags: SecurityFlag[];
    flagTier: SecurityFlagTier;
    narrative: string;
    status: 'completed' | 'failed';
  };

  seo: {
    grade: ClientGrade;
    score: number;
    failingSignals: SeoFailingSignalKey[];
    narrative: string;
    status: 'completed' | 'failed';
  };
};

function effectiveGradeRank(grade: ClientGrade): number {
  const g: Grade = grade === 'N/A' ? 'C' : grade;
  switch (g) {
    case 'A':
      return 5;
    case 'B':
      return 4;
    case 'C':
      return 3;
    case 'D':
      return 2;
    case 'F':
      return 1;
  }
}

/**
 * Picks a results headline from the three grades. N/A is treated as C for
 * comparison (after F/D rules).
 */
export function getResultsHeadline(
  firstName: string,
  grades: {
    speedGrade: ClientGrade;
    securityGrade: ClientGrade;
    seoGrade: ClientGrade;
  }
): string {
  const { speedGrade, securityGrade, seoGrade } = grades;
  const all = [speedGrade, securityGrade, seoGrade];

  if (all.some((g) => g === 'F')) {
    return `${firstName}, your website is working against you.`;
  }

  if (all.some((g) => g === 'D')) {
    const goodGrades = all.filter((g) => g === 'A' || g === 'B');
    if (goodGrades.length === 2) {
      const badIndex = all.findIndex((g) => g === 'D');
      const category = badIndex === 0 ? 'speed' : badIndex === 1 ? 'security' : 'SEO visibility';
      const goodCategories =
        badIndex === 0 ? 'your security and SEO visibility are solid'
        : badIndex === 1 ? 'your speed and SEO visibility are solid'
        : 'your speed and security are solid';
      return `${firstName}, ${goodCategories} — but your ${category} is costing you leads.`;
    }
    return `${firstName}, your site is actively costing you leads.`;
  }

  const worstRank = Math.min(...all.map(effectiveGradeRank));

  if (worstRank === 3) {
    return `${firstName}, your site needs some work — but the fix is straightforward.`;
  }

  return `${firstName}, your site is in great shape.`;
}
