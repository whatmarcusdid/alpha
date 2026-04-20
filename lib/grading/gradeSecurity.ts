import type { LetterGrade } from '@/lib/types/audit';

export type SecurityGradeInput = {
  safeBrowsingFlagged: boolean;
  sucuriFlagged: boolean;
  missingHeadersCount: number; // 0–6
  outdatedCms: boolean;
};

export type SecurityGradeResult = {
  letterGrade: LetterGrade;
  flags: string[]; // plain-language descriptions of what failed
};

function letterFromSecurityScore(score: number): LetterGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 50) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function collectFlags(input: SecurityGradeInput): string[] {
  const flags: string[] = [];

  if (input.safeBrowsingFlagged) {
    flags.push('Google has flagged this site as unsafe');
  }
  if (input.sucuriFlagged) {
    flags.push('Site appears on one or more security blacklists');
  }
  if (input.outdatedCms) {
    flags.push('CMS software is out of date and may be vulnerable');
  }
  if (input.missingHeadersCount > 0) {
    const n = input.missingHeadersCount;
    flags.push(
      `Missing ${n} security header(s) that protect against common attacks`
    );
  }

  return flags;
}

export function gradeSecurity(input: SecurityGradeInput): SecurityGradeResult {
  if (input.safeBrowsingFlagged || input.sucuriFlagged) {
    return {
      letterGrade: 'F',
      flags: collectFlags(input),
    };
  }

  const score =
    100 - input.missingHeadersCount * 10 - (input.outdatedCms ? 20 : 0);

  return {
    letterGrade: letterFromSecurityScore(score),
    flags: collectFlags(input),
  };
}
