import type { ClientGrade } from '@/lib/types/audit';

import type { SiteFixSKU } from './skus';

const FAILING_GRADES: ClientGrade[] = ['C', 'D', 'F', 'N/A'];

export function isFailingGrade(grade: ClientGrade): boolean {
  return FAILING_GRADES.includes(grade);
}

export function derivePreSelectedSkus(grades: {
  speedGrade: ClientGrade;
  securityGrade: ClientGrade;
  seoGrade: ClientGrade;
}): SiteFixSKU[] {
  const skus: SiteFixSKU[] = [];

  if (isFailingGrade(grades.seoGrade)) {
    skus.push('seo_ai_visibility_fix');
  }
  if (isFailingGrade(grades.speedGrade)) {
    skus.push('speed_fix');
  }
  if (isFailingGrade(grades.securityGrade)) {
    skus.push('security_fix');
  }

  return skus;
}

export function hasAnyFailingGrade(grades: {
  speedGrade: ClientGrade;
  securityGrade: ClientGrade;
  seoGrade: ClientGrade;
}): boolean {
  return derivePreSelectedSkus(grades).length > 0;
}

export function isAllGradesHealthy(grades: {
  speedGrade: ClientGrade;
  securityGrade: ClientGrade;
  seoGrade: ClientGrade;
}): boolean {
  return (
    (grades.speedGrade === 'A' || grades.speedGrade === 'B') &&
    (grades.securityGrade === 'A' || grades.securityGrade === 'B') &&
    (grades.seoGrade === 'A' || grades.seoGrade === 'B')
  );
}
