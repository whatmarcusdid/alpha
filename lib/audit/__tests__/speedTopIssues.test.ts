import { describe, expect, it } from 'vitest';

import {
  extractSpeedTopIssues,
  SPEED_ISSUE_DISPLAY_NAMES,
  type SpeedTopIssueKey,
} from '@/lib/audit/speedTopIssues';

type PsiAudits = Record<
  string,
  { score: number | null; displayValue?: string }
>;

describe('extractSpeedTopIssues', () => {
  it('returns [] for null input', () => {
    expect(extractSpeedTopIssues(null)).toEqual([]);
  });

  it('returns [] for undefined input', () => {
    expect(extractSpeedTopIssues(undefined)).toEqual([]);
  });

  it('returns [] when no matching audit IDs exist', () => {
    const audits: PsiAudits = {
      'some-unknown-audit': { score: 0 },
    };
    expect(extractSpeedTopIssues(audits)).toEqual([]);
  });

  it('returns the canonical key for a single failing audit', () => {
    const audits: PsiAudits = {
      'render-blocking-resources': { score: 0.2 },
    };
    expect(extractSpeedTopIssues(audits)).toEqual([
      'render_blocking_resources',
    ]);
  });

  it('deduplicates two PSI IDs that map to the same canonical key', () => {
    const audits: PsiAudits = {
      'unused-css-rules': { score: 0.1 },
      'unused-javascript': { score: 0.2 },
    };
    expect(extractSpeedTopIssues(audits)).toEqual(['unused_css_js']);
  });

  it('returns at most 4 failing issues', () => {
    const audits: PsiAudits = {
      'render-blocking-resources': { score: 0 },
      'uses-optimized-images': { score: 0 },
      'unused-css-rules': { score: 0 },
      'unminified-css': { score: 0 },
      'uses-text-compression': { score: 0 },
      'uses-long-cache-ttl': { score: 0 },
    };
    expect(extractSpeedTopIssues(audits)).toHaveLength(4);
  });

  it('respects priority order', () => {
    const audits: PsiAudits = {
      'server-response-time': { score: 0 },
      'render-blocking-resources': { score: 0 },
      'uses-optimized-images': { score: 0 },
    };
    expect(extractSpeedTopIssues(audits)).toEqual([
      'render_blocking_resources',
      'oversized_images',
      'slow_server_response',
    ]);
  });

  it('excludes audits with score 0.9', () => {
    const audits: PsiAudits = {
      'render-blocking-resources': { score: 0.9 },
    };
    expect(extractSpeedTopIssues(audits)).toEqual([]);
  });

  it('includes audits with null score', () => {
    const audits: PsiAudits = {
      'render-blocking-resources': { score: null },
    };
    expect(extractSpeedTopIssues(audits)).toEqual([
      'render_blocking_resources',
    ]);
  });

  it('silently ignores unknown audit IDs', () => {
    const audits: PsiAudits = {
      'totally-made-up-audit': { score: 0 },
      'render-blocking-resources': { score: 0.1 },
    };
    expect(extractSpeedTopIssues(audits)).toEqual([
      'render_blocking_resources',
    ]);
  });

  it('never throws on malformed input', () => {
    expect(() => extractSpeedTopIssues({})).not.toThrow();
  });
});

describe('SPEED_ISSUE_DISPLAY_NAMES', () => {
  it('has a display name for every SpeedTopIssueKey', () => {
    const keys: SpeedTopIssueKey[] = [
      'render_blocking_resources',
      'unused_css_js',
      'oversized_images',
      'missing_compression',
      'no_cache_headers',
      'slow_server_response',
      'heavy_third_party_scripts',
      'unminified_css_js',
    ];
    for (const key of keys) {
      expect(SPEED_ISSUE_DISPLAY_NAMES[key]).toBeTruthy();
    }
  });
});
