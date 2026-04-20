import type { LetterGrade } from '@/lib/types/audit';

export type SpeedGradeInput = {
  performanceScore: number; // 0–100 from PageSpeed Insights
  lcp: number; // Largest Contentful Paint in seconds
  tbt: number; // Total Blocking Time in milliseconds
  cls: number; // Cumulative Layout Shift (unitless)
};

export type SpeedGradeResult = {
  letterGrade: LetterGrade;
  performanceScore: number;
  topIssues: string[]; // 0–3 plain-language issue strings
};

function letterFromPerformanceScore(score: number): LetterGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 50) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function formatLcpSeconds(lcp: number): string {
  const rounded = Math.round(lcp * 100) / 100;
  return String(rounded);
}

function formatCls(cls: number): string {
  const rounded = Math.round(cls * 1000) / 1000;
  return String(rounded);
}

function collectTopIssues(input: SpeedGradeInput): string[] {
  const { lcp, tbt, cls } = input;
  const issues: string[] = [];

  if (lcp > 4.0) {
    issues.push(
      `Page takes too long to show main content (LCP: ${formatLcpSeconds(lcp)}s)`
    );
  } else if (lcp >= 2.5 && lcp <= 4.0) {
    issues.push(`Main content could load faster (LCP: ${formatLcpSeconds(lcp)}s)`);
  }

  if (tbt > 600) {
    issues.push(`Heavy scripts are blocking the page (TBT: ${Math.round(tbt)}ms)`);
  } else if (tbt >= 200 && tbt <= 600) {
    issues.push(
      `Some scripts are slowing page responsiveness (TBT: ${Math.round(tbt)}ms)`
    );
  }

  if (cls > 0.25) {
    issues.push(`Page elements are shifting after load (CLS: ${formatCls(cls)})`);
  } else if (cls >= 0.1 && cls <= 0.25) {
    issues.push(`Minor layout shifts detected (CLS: ${formatCls(cls)})`);
  }

  return issues.slice(0, 3);
}

export function gradeSpeed(input: SpeedGradeInput): SpeedGradeResult {
  const { performanceScore } = input;
  return {
    letterGrade: letterFromPerformanceScore(performanceScore),
    performanceScore,
    topIssues: collectTopIssues(input),
  };
}
