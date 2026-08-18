/**
 * Thin browser wrapper around Meta Pixel `window.fbq`.
 * All calls no-op when `fbq` is missing (ad blockers, slow load, SSR).
 */

export type MetaFbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: MetaFbq;
    _fbq?: MetaFbq;
  }
}

export function getMetaPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  return raw;
}

function getFbq(): MetaFbq | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.fbq;
}

export function trackPageView(): void {
  const fbq = getFbq();
  if (!fbq) return;
  fbq('track', 'PageView');
}

export function trackLead(params?: Record<string, unknown>): void {
  const fbq = getFbq();
  if (!fbq) return;
  if (params) {
    fbq('track', 'Lead', params);
  } else {
    fbq('track', 'Lead');
  }
}

export function trackEvent(
  name: string,
  params?: Record<string, unknown>
): void {
  const fbq = getFbq();
  if (!fbq) return;
  if (params) {
    fbq('trackCustom', name, params);
  } else {
    fbq('trackCustom', name);
  }
}
