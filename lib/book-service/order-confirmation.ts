import { formatEntitlementLabels } from './entitlement-labels';
import { getFixItemsForOrder } from './site-fix-features';
import { SITE_FIX_SKUS, expandEntitlements, type SiteFixSKU } from './skus';
import type { SiteFixOrderStatusResponse } from './types';

export const SAMPLE_CONFIRMATION_ORDER: SiteFixOrderStatusResponse = {
  orderId: 'BS-284719',
  sku: 'speed_fix',
  entitlements: ['speed'],
  status: 'paid',
  createdAt: new Date('2025-06-25T14:32:00.000Z').toISOString(),
  normalizedEmail: 'john@exampleplumbing.com',
  firstName: 'John',
  websiteUrl: 'https://exampleplumbing.com',
  auditLeadId: 'audit_lead_sample_001',
};

export function getConfirmationPackageName(sku: SiteFixSKU): string {
  if (sku === 'full_bundle') {
    return 'Full Site Fix Bundle';
  }

  return SITE_FIX_SKUS[sku].displayName;
}

export function formatConfirmationDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatOrderTotal(sku: SiteFixSKU): string {
  const price = SITE_FIX_SKUS[sku].price;
  if (price === null) {
    return 'Bundle pricing';
  }

  return `$${price.toLocaleString('en-US')}`;
}

export function formatLinkedAuditLabel(websiteUrl?: string, auditLeadId?: string): string {
  if (websiteUrl) {
    try {
      return new URL(websiteUrl).hostname.replace(/^www\./, '');
    } catch {
      return websiteUrl;
    }
  }

  if (auditLeadId) {
    return auditLeadId;
  }

  return 'Your audit';
}

export function buildConfirmationHeading(order: SiteFixOrderStatusResponse): string {
  const packageName = getConfirmationPackageName(order.sku);

  if (order.firstName) {
    return `You're all set, ${order.firstName} — your ${packageName} is confirmed.`;
  }

  return `You're all set — your ${packageName} is confirmed.`;
}

export function buildConfirmationSubtext(order: SiteFixOrderStatusResponse): string {
  if (order.normalizedEmail) {
    return `We've emailed your receipt and next steps to ${order.normalizedEmail}.`;
  }

  return "We've emailed your receipt and next steps to your inbox.";
}

export function getPlanSummary(order: SiteFixOrderStatusResponse): string {
  if (order.sku === 'full_bundle') {
    return formatEntitlementLabels(order.entitlements);
  }

  return getConfirmationPackageName(order.sku);
}

export function getPreviewOrder(searchParams: URLSearchParams): SiteFixOrderStatusResponse {
  const skuParam = searchParams.get('sku');
  const sku =
    skuParam && skuParam in SITE_FIX_SKUS
      ? (skuParam as SiteFixSKU)
      : SAMPLE_CONFIRMATION_ORDER.sku;

  return {
    ...SAMPLE_CONFIRMATION_ORDER,
    sku,
    entitlements: expandEntitlements(sku),
    createdAt: new Date().toISOString(),
  };
}

export { getFixItemsForOrder };

export const WHAT_HAPPENS_NEXT_ITEMS = [
  "Within 48 hours, you'll get an email with onboarding instructions and what access we'll need.",
  'Once we confirm access, your fixes begin — most sites are completed within 48 hours.',
  'You can check your order status anytime from your dashboard.',
  "When everything's done, you'll get a before/after report and a short video walkthrough.",
] as const;
