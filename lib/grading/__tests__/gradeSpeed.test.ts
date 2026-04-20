import { describe, expect, it } from 'vitest';

import { gradeSpeed } from '@/lib/grading/gradeSpeed';

const healthyMetrics = { lcp: 1.5, tbt: 50, cls: 0.05 };

describe('gradeSpeed', () => {
  describe('letter grade from performanceScore (healthy LCP/TBT/CLS)', () => {
    it('maps score 100 to A', () => {
      expect(
        gradeSpeed({ performanceScore: 100, ...healthyMetrics }).letterGrade
      ).toBe('A');
    });

    it('maps score 90 to A', () => {
      expect(
        gradeSpeed({ performanceScore: 90, ...healthyMetrics }).letterGrade
      ).toBe('A');
    });

    it('maps score 89 to B', () => {
      expect(
        gradeSpeed({ performanceScore: 89, ...healthyMetrics }).letterGrade
      ).toBe('B');
    });

    it('maps score 75 to B', () => {
      expect(
        gradeSpeed({ performanceScore: 75, ...healthyMetrics }).letterGrade
      ).toBe('B');
    });

    it('maps score 74 to C', () => {
      expect(
        gradeSpeed({ performanceScore: 74, ...healthyMetrics }).letterGrade
      ).toBe('C');
    });

    it('maps score 50 to C', () => {
      expect(
        gradeSpeed({ performanceScore: 50, ...healthyMetrics }).letterGrade
      ).toBe('C');
    });

    it('maps score 49 to D', () => {
      expect(
        gradeSpeed({ performanceScore: 49, ...healthyMetrics }).letterGrade
      ).toBe('D');
    });

    it('maps score 25 to D', () => {
      expect(
        gradeSpeed({ performanceScore: 25, ...healthyMetrics }).letterGrade
      ).toBe('D');
    });

    it('maps score 24 to F', () => {
      expect(
        gradeSpeed({ performanceScore: 24, ...healthyMetrics }).letterGrade
      ).toBe('F');
    });

    it('maps score 0 to F', () => {
      expect(
        gradeSpeed({ performanceScore: 0, ...healthyMetrics }).letterGrade
      ).toBe('F');
    });
  });

  describe('topIssues from Core Web Vitals (performanceScore 50)', () => {
    const base = { performanceScore: 50, tbt: 50, cls: 0.05 };

    it('flags very slow LCP (>4s)', () => {
      const { topIssues } = gradeSpeed({ ...base, lcp: 5.0 });
      expect(
        topIssues.some((s) =>
          s.includes('Page takes too long to show main content')
        )
      ).toBe(true);
    });

    it('flags moderately slow LCP (2.5–4s)', () => {
      const { topIssues } = gradeSpeed({ ...base, lcp: 3.0 });
      expect(
        topIssues.some((s) => s.includes('Main content could load faster'))
      ).toBe(true);
    });

    it('flags high TBT (>600ms)', () => {
      const { topIssues } = gradeSpeed({ ...base, lcp: 1.5, tbt: 700 });
      expect(
        topIssues.some((s) => s.includes('Heavy scripts are blocking the page'))
      ).toBe(true);
    });

    it('flags elevated TBT (200–600ms)', () => {
      const { topIssues } = gradeSpeed({ ...base, lcp: 1.5, tbt: 300 });
      expect(
        topIssues.some((s) =>
          s.includes('Some scripts are slowing page responsiveness')
        )
      ).toBe(true);
    });

    it('flags high CLS (>0.25)', () => {
      const { topIssues } = gradeSpeed({ ...base, lcp: 1.5, cls: 0.3 });
      expect(
        topIssues.some((s) =>
          s.includes('Page elements are shifting after load')
        )
      ).toBe(true);
    });

    it('flags moderate CLS (0.1–0.25)', () => {
      const { topIssues } = gradeSpeed({ ...base, lcp: 1.5, cls: 0.15 });
      expect(
        topIssues.some((s) => s.includes('Minor layout shifts detected'))
      ).toBe(true);
    });

    it('caps topIssues at exactly 3 when LCP, TBT, and CLS all exceed thresholds', () => {
      const { topIssues } = gradeSpeed({
        performanceScore: 50,
        lcp: 5.0,
        tbt: 700,
        cls: 0.3,
      });
      expect(topIssues).toHaveLength(3);
    });

    it('returns no issues when all metrics are healthy', () => {
      const { topIssues } = gradeSpeed({
        performanceScore: 50,
        lcp: 1.0,
        tbt: 50,
        cls: 0.02,
      });
      expect(topIssues).toEqual([]);
    });
  });
});
