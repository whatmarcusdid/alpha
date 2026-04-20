import type { GeminiUXResponse, LetterGrade, UXPillarScores } from '@/lib/types/audit';

export type UXGradeResult = {
  letterGrade: LetterGrade;
  totalScore: number; // 0–9
  pillarScores: UXPillarScores;
  failingSignals: string[];
};

function clampPillar(value: number): number {
  return Math.min(3, Math.max(0, Math.round(value)));
}

function letterFromTotalScore(total: number): LetterGrade {
  if (total >= 8) return 'A';
  if (total >= 6) return 'B';
  if (total >= 4) return 'C';
  if (total >= 2) return 'D';
  return 'F';
}

function normalizeFailingSignals(
  value: GeminiUXResponse['failingSignals']
): string[] {
  return Array.isArray(value) ? value : [];
}

export function gradeUX(response: GeminiUXResponse): UXGradeResult {
  const understand = clampPillar(response.understand);
  const see = clampPillar(response.see);
  const know = clampPillar(response.know);

  const pillarScores: UXPillarScores = {
    understand,
    see,
    know,
  };

  const totalScore = understand + see + know;

  return {
    letterGrade: letterFromTotalScore(totalScore),
    totalScore,
    pillarScores,
    failingSignals: normalizeFailingSignals(response.failingSignals),
  };
}
