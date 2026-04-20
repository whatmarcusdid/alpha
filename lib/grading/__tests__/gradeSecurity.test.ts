import { describe, expect, it } from 'vitest';

import { gradeSecurity } from '@/lib/grading/gradeSecurity';

const clean = {
  safeBrowsingFlagged: false,
  sucuriFlagged: false,
  missingHeadersCount: 0,
  outdatedCms: false,
};

describe('gradeSecurity', () => {
  describe('F override when Safe Browsing or Sucuri flags a site', () => {
    it('returns F when Safe Browsing flagged and other signals are clean', () => {
      expect(
        gradeSecurity({
          ...clean,
          safeBrowsingFlagged: true,
        }).letterGrade
      ).toBe('F');
    });

    it('returns F when Sucuri flagged and other signals are clean', () => {
      expect(
        gradeSecurity({
          ...clean,
          sucuriFlagged: true,
        }).letterGrade
      ).toBe('F');
    });

    it('returns F and includes both vendor messages when both are flagged', () => {
      const { letterGrade, flags } = gradeSecurity({
        ...clean,
        safeBrowsingFlagged: true,
        sucuriFlagged: true,
      });
      expect(letterGrade).toBe('F');
      expect(
        flags.some((f) => f.includes('Google has flagged this site'))
      ).toBe(true);
      expect(
        flags.some((f) => f.includes('security blacklist'))
      ).toBe(true);
    });
  });

  describe('letter grade from computed score (no blacklist flags)', () => {
    it('returns A when score is 100 (no missing headers, CMS current)', () => {
      expect(gradeSecurity(clean).letterGrade).toBe('A');
    });

    it('returns B when score is 80 (2 missing headers)', () => {
      expect(
        gradeSecurity({ ...clean, missingHeadersCount: 2 }).letterGrade
      ).toBe('B');
    });

    it('returns C when score is 50 (3 missing headers + outdated CMS)', () => {
      expect(
        gradeSecurity({
          ...clean,
          missingHeadersCount: 3,
          outdatedCms: true,
        }).letterGrade
      ).toBe('C');
    });

    it('returns D when score is 30 (5 missing headers + outdated CMS)', () => {
      expect(
        gradeSecurity({
          ...clean,
          missingHeadersCount: 5,
          outdatedCms: true,
        }).letterGrade
      ).toBe('D');
    });

    it('returns F when score is 20 (6 missing headers + outdated CMS)', () => {
      expect(
        gradeSecurity({
          ...clean,
          missingHeadersCount: 6,
          outdatedCms: true,
        }).letterGrade
      ).toBe('F');
    });
  });

  describe('flags array content', () => {
    it('returns an empty flags array when everything is clean', () => {
      expect(gradeSecurity(clean).flags).toEqual([]);
    });

    it('includes the outdated CMS message when outdatedCms is true', () => {
      const { flags } = gradeSecurity({ ...clean, outdatedCms: true });
      expect(
        flags.some((f) => f.includes('CMS software is out of date'))
      ).toBe(true);
    });

    it('includes the missing-headers count when headers are missing', () => {
      const { flags } = gradeSecurity({ ...clean, missingHeadersCount: 3 });
      expect(
        flags.some((f) => f.includes('Missing 3 security header(s)'))
      ).toBe(true);
    });

    it('includes the Safe Browsing message when safeBrowsingFlagged is true', () => {
      const { flags } = gradeSecurity({
        ...clean,
        safeBrowsingFlagged: true,
      });
      expect(
        flags.some((f) => f.includes('Google has flagged this site'))
      ).toBe(true);
    });
  });
});
