import { describe, expect, it } from 'vitest';

import { getResultsHeadline } from '@/lib/types/audit';

describe('getResultsHeadline', () => {
  describe('all grades A or B', () => {
    it('uses the “great shape” line when speed is A, security is A, and SEO is B', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'A',
        securityGrade: 'A',
        seoGrade: 'B',
      });
      expect(h).toContain('in great shape');
    });
  });

  describe('worst effective grade is C (including N/A treated as C)', () => {
    it('uses the “needs some work” line when speed is C and other pillars are A', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'C',
        securityGrade: 'A',
        seoGrade: 'A',
      });
      expect(h).toContain('needs some work');
    });

    it('uses the “needs some work” line when security is C with mixed A/B elsewhere', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'A',
        securityGrade: 'C',
        seoGrade: 'B',
      });
      expect(h).toContain('needs some work');
    });

    it('treats N/A on speed like C: headline reflects a C-level outcome', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'N/A',
        securityGrade: 'A',
        seoGrade: 'A',
      });
      expect(h).toContain('needs some work');
    });

    it('treats all N/A grades like C across the board', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'N/A',
        securityGrade: 'N/A',
        seoGrade: 'N/A',
      });
      expect(h).toContain('needs some work');
    });
  });

  describe('any D with no F', () => {
    it('uses the “costing you leads” line when only speed is D', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'D',
        securityGrade: 'A',
        seoGrade: 'A',
      });
      expect(h).toContain('costing you leads');
    });

    it('uses the “costing you leads” line when security is D even with mixed lower tiers', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'B',
        securityGrade: 'D',
        seoGrade: 'C',
      });
      expect(h).toContain('costing you leads');
    });
  });

  describe('any F', () => {
    it('uses the “working against you” line when speed is F', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'F',
        securityGrade: 'A',
        seoGrade: 'A',
      });
      expect(h).toContain('working against you');
    });

    it('uses the “working against you” line when SEO is F', () => {
      const h = getResultsHeadline('Alex', {
        speedGrade: 'A',
        securityGrade: 'A',
        seoGrade: 'F',
      });
      expect(h).toContain('working against you');
    });
  });

  describe('first-name prefix', () => {
    it('prefixes the headline with the visitor first name (Riley)', () => {
      const h = getResultsHeadline('Riley', {
        speedGrade: 'A',
        securityGrade: 'A',
        seoGrade: 'A',
      });
      expect(h.startsWith('Riley,')).toBe(true);
    });

    it('prefixes the headline with the visitor first name (Marcus)', () => {
      const h = getResultsHeadline('Marcus', {
        speedGrade: 'A',
        securityGrade: 'A',
        seoGrade: 'A',
      });
      expect(h.startsWith('Marcus,')).toBe(true);
    });
  });
});
