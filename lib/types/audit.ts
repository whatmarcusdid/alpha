import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type UXPillarScores = {
  understand: number; // 0–3
  see: number; // 0–3
  know: number; // 0–3
};

/** Plain-language paragraphs; may be deterministic fallbacks if Gemini failed — never undefined. */
export type AuditNarratives = {
  speed: string;
  security: string;
  ux: string;
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
  businessName: string;
  firstName: string;
  email: string;
  websiteUrl: string;
  speedGrade: LetterGrade | 'N/A';
  speedScore: number;
  securityGrade: LetterGrade | 'N/A';
  securityFlags: string[];
  uxGrade: LetterGrade | 'N/A';
  uxScore: number;
  uxPillarScores: UXPillarScores;
  uxFailingSignals: string[];
  aiNarrative: AuditNarratives;
  timestamp: Timestamp;
  source: 'public_audit';
};

export type AuditResult = {
  businessName: string;
  websiteUrl: string;
  speedGrade: LetterGrade | 'N/A';
  speedScore: number;
  speedTopIssues: string[];
  securityGrade: LetterGrade | 'N/A';
  securityFlags: string[];
  uxGrade: LetterGrade | 'N/A';
  uxScore: number;
  uxPillarScores: UXPillarScores;
  uxFailingSignals: string[];
  aiNarrative: AuditNarratives;
};

export type GeminiUXResponse = {
  understand: number;
  see: number;
  know: number;
  failingSignals: string[];
};

function effectiveGradeRank(grade: LetterGrade | 'N/A'): number {
  const g: LetterGrade = grade === 'N/A' ? 'C' : grade;
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
    speedGrade: LetterGrade | 'N/A';
    securityGrade: LetterGrade | 'N/A';
    uxGrade: LetterGrade | 'N/A';
  }
): string {
  const { speedGrade, securityGrade, uxGrade } = grades;
  const all = [speedGrade, securityGrade, uxGrade];

  if (all.some((g) => g === 'F')) {
    return `${firstName}, your website is working against you.`;
  }

  if (all.some((g) => g === 'D')) {
    const goodGrades = all.filter((g) => g === 'A' || g === 'B');
    if (goodGrades.length === 2) {
      const badIndex = all.findIndex((g) => g === 'D');
      const category = badIndex === 0 ? 'speed' : badIndex === 1 ? 'security' : 'first impression';
      const goodCategories =
        badIndex === 0 ? 'your security and first impression are solid'
        : badIndex === 1 ? 'your speed and first impression are solid'
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
