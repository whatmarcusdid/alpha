import { describe, expect, it } from 'vitest';

import { gradeSecurity } from '@/lib/grading/gradeSecurity';
import type { SecurityFlag } from '@/lib/types/audit';

describe('gradeSecurity', () => {
  describe('tier1 flags', () => {
    it('returns F and tier1 when any tier1 flag is present', () => {
      const tier1Flags: SecurityFlag[] = [
        'malware_detected',
        'blacklisted',
        'phishing_detected',
        'unwanted_software_detected',
        'no_https',
      ];

      for (const flag of tier1Flags) {
        expect(gradeSecurity([flag])).toEqual({ grade: 'F', flagTier: 'tier1' });
      }
    });
  });

  describe('tier2 flags', () => {
    it('returns D and tier2 when only invalid_ssl is present', () => {
      expect(gradeSecurity(['invalid_ssl'])).toEqual({
        grade: 'D',
        flagTier: 'tier2',
      });
    });

    it('returns F and tier2 when invalid_ssl plus 4+ advisory flags', () => {
      expect(
        gradeSecurity([
          'invalid_ssl',
          'missing_security_headers',
          'outdated_cms',
          'http_redirect_missing',
          'mixed_content',
        ])
      ).toEqual({ grade: 'F', flagTier: 'tier2' });
    });
  });

  describe('advisory-only flags', () => {
    it('returns A and none when no flags', () => {
      expect(gradeSecurity([])).toEqual({ grade: 'A', flagTier: 'none' });
    });

    it('returns B with one advisory flag', () => {
      expect(gradeSecurity(['missing_security_headers'])).toEqual({
        grade: 'B',
        flagTier: 'advisory',
      });
    });

    it('returns C with two advisory flags', () => {
      expect(
        gradeSecurity(['missing_security_headers', 'outdated_cms'])
      ).toEqual({ grade: 'C', flagTier: 'advisory' });
    });

    it('returns D with three advisory flags', () => {
      expect(
        gradeSecurity([
          'missing_security_headers',
          'outdated_cms',
          'http_redirect_missing',
        ])
      ).toEqual({ grade: 'D', flagTier: 'advisory' });
    });

    it('returns F with four or more advisory flags', () => {
      expect(
        gradeSecurity([
          'missing_security_headers',
          'outdated_cms',
          'http_redirect_missing',
          'mixed_content',
        ])
      ).toEqual({ grade: 'F', flagTier: 'advisory' });
    });
  });
});
