import { describe, expect, it } from 'vitest';

import { seedHostingContextFromOnboarding } from '@/lib/fix-jobs/seed-hosting-context';

describe('seedHostingContextFromOnboarding', () => {
  it('maps available onboarding fields to hostingContext shape', () => {
    const result = seedHostingContextFromOnboarding({
      siteFix: {
        websiteUrl: 'https://example.com',
        access_request: {
          hostingProvider: 'SiteGround',
          method: 'WordPress login',
        },
      },
    });

    expect(result).toEqual({
      host: 'siteground',
      cms: 'wordpress',
      plugins: [],
    });
  });

  it('maps unknown hosting provider to other with hostLabel', () => {
    const result = seedHostingContextFromOnboarding({
      siteFix: {
        access_request: {
          hostingProvider: 'Pagely Managed',
          method: 'Hosting panel login',
        },
      },
    });

    expect(result.host).toBe('other');
    expect(result.hostLabel).toBe('Pagely Managed');
    expect(result.plugins).toEqual([]);
  });

  it('returns empty object when no onboarding fields exist', () => {
    expect(seedHostingContextFromOnboarding({})).toEqual({ plugins: [] });
    expect(seedHostingContextFromOnboarding({ siteFix: {} })).toEqual({ plugins: [] });
  });

  it('never throws — returns partial result on any missing field', () => {
    expect(() =>
      seedHostingContextFromOnboarding({
        siteFix: {
          access_request: {
            hostingProvider: 123,
            method: null,
          },
        },
      })
    ).not.toThrow();

    expect(
      seedHostingContextFromOnboarding({
        siteFix: {
          access_request: {
            hostingProvider: 123,
            method: null,
          },
        },
      })
    ).toEqual({ plugins: [] });
  });
});
