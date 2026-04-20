import { describe, expect, it } from 'vitest';

import { gradeUX } from '@/lib/grading/gradeUX';
import type { GeminiUXResponse } from '@/lib/types/audit';

describe('gradeUX', () => {
  describe('letter grade from total pillar score (0–9)', () => {
    it('maps 9 points to A', () => {
      const r = gradeUX({ understand: 3, see: 3, know: 3, failingSignals: [] });
      expect(r.totalScore).toBe(9);
      expect(r.letterGrade).toBe('A');
    });

    it('maps 8 points to A', () => {
      const r = gradeUX({ understand: 3, see: 3, know: 2, failingSignals: [] });
      expect(r.totalScore).toBe(8);
      expect(r.letterGrade).toBe('A');
    });

    it('maps 7 points to B', () => {
      const r = gradeUX({ understand: 3, see: 2, know: 2, failingSignals: [] });
      expect(r.totalScore).toBe(7);
      expect(r.letterGrade).toBe('B');
    });

    it('maps 6 points to B', () => {
      const r = gradeUX({ understand: 2, see: 2, know: 2, failingSignals: [] });
      expect(r.totalScore).toBe(6);
      expect(r.letterGrade).toBe('B');
    });

    it('maps 5 points to C', () => {
      const r = gradeUX({ understand: 2, see: 2, know: 1, failingSignals: [] });
      expect(r.totalScore).toBe(5);
      expect(r.letterGrade).toBe('C');
    });

    it('maps 4 points to C', () => {
      const r = gradeUX({ understand: 2, see: 1, know: 1, failingSignals: [] });
      expect(r.totalScore).toBe(4);
      expect(r.letterGrade).toBe('C');
    });

    it('maps 3 points to D', () => {
      const r = gradeUX({ understand: 1, see: 1, know: 1, failingSignals: [] });
      expect(r.totalScore).toBe(3);
      expect(r.letterGrade).toBe('D');
    });

    it('maps 2 points to D', () => {
      const r = gradeUX({ understand: 1, see: 1, know: 0, failingSignals: [] });
      expect(r.totalScore).toBe(2);
      expect(r.letterGrade).toBe('D');
    });

    it('maps 1 point to F', () => {
      const r = gradeUX({ understand: 1, see: 0, know: 0, failingSignals: [] });
      expect(r.totalScore).toBe(1);
      expect(r.letterGrade).toBe('F');
    });

    it('maps 0 points to F', () => {
      const r = gradeUX({ understand: 0, see: 0, know: 0, failingSignals: [] });
      expect(r.totalScore).toBe(0);
      expect(r.letterGrade).toBe('F');
    });
  });

  describe('defensive clamping and rounding of pillar inputs', () => {
    it('clamps understand above 3 down to 3 without throwing', () => {
      expect(() =>
        gradeUX({ understand: 4, see: 0, know: 0, failingSignals: [] })
      ).not.toThrow();
      const r = gradeUX({ understand: 4, see: 0, know: 0, failingSignals: [] });
      expect(r.pillarScores.understand).toBe(3);
    });

    it('clamps negative see up to 0 without throwing', () => {
      expect(() =>
        gradeUX({ understand: 0, see: -1, know: 0, failingSignals: [] })
      ).not.toThrow();
      const r = gradeUX({ understand: 0, see: -1, know: 0, failingSignals: [] });
      expect(r.pillarScores.see).toBe(0);
    });

    it('rounds fractional know values before clamping (e.g. 2.7 → 3)', () => {
      expect(() =>
        gradeUX({ understand: 0, see: 0, know: 2.7, failingSignals: [] })
      ).not.toThrow();
      const r = gradeUX({ understand: 0, see: 0, know: 2.7, failingSignals: [] });
      expect(r.pillarScores.know).toBe(3);
    });
  });

  describe('failingSignals passthrough', () => {
    it('returns the same failingSignals array by value', () => {
      const r = gradeUX({
        understand: 1,
        see: 1,
        know: 1,
        failingSignals: ['u2', 's1'],
      });
      expect(r.failingSignals).toEqual(['u2', 's1']);
    });

    it('treats non-array failingSignals as empty (runtime guard)', () => {
      const r = gradeUX({
        understand: 1,
        see: 1,
        know: 1,
        failingSignals: undefined as any,
      } as GeminiUXResponse);
      expect(r.failingSignals).toEqual([]);
    });
  });
});
