import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getMetaPixelId,
  trackEvent,
  trackLead,
  trackPageView,
} from '@/lib/analytics/metaPixel';

describe('metaPixel', () => {
  const originalPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '367773903612246';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalPixelId === undefined) {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    } else {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = originalPixelId;
    }
  });

  it('returns a numeric pixel id and rejects invalid values', () => {
    expect(getMetaPixelId()).toBe('367773903612246');

    process.env.NEXT_PUBLIC_META_PIXEL_ID = 'not-a-pixel';
    expect(getMetaPixelId()).toBeNull();

    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    expect(getMetaPixelId()).toBeNull();
  });

  it('no-ops when fbq is not loaded', () => {
    expect(() => {
      trackPageView();
      trackLead();
      trackEvent('audit_result_generated');
    }).not.toThrow();
  });

  it('forwards PageView, Lead, and custom events to fbq', () => {
    const fbq = vi.fn();
    vi.stubGlobal('window', { fbq });

    trackPageView();
    trackLead();
    trackEvent('audit_result_generated');
    trackLead({ content_name: 'site_audit' });
    trackEvent('audit_form_start', { source: 'form' });

    expect(fbq).toHaveBeenCalledTimes(5);
    expect(fbq).toHaveBeenNthCalledWith(1, 'track', 'PageView');
    expect(fbq).toHaveBeenNthCalledWith(2, 'track', 'Lead');
    expect(fbq).toHaveBeenNthCalledWith(3, 'trackCustom', 'audit_result_generated');
    expect(fbq).toHaveBeenNthCalledWith(4, 'track', 'Lead', {
      content_name: 'site_audit',
    });
    expect(fbq).toHaveBeenNthCalledWith(5, 'trackCustom', 'audit_form_start', {
      source: 'form',
    });
  });
});
