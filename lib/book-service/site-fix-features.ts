import type { SiteFixEntitlement, SiteFixSKU } from './skus';

export const SITE_FIX_FEATURES: Record<SiteFixSKU, string[]> = {
  seo_ai_visibility_fix: [
    'Rewrite page titles and headings',
    'Add service area and location details',
    'Add FAQ and schema markup',
    'Before/after visibility report',
  ],
  speed_fix: [
    'Compress and optimize oversized images',
    'Remove render-blocking scripts',
    'Configure browser caching',
    'Before/after speed report',
  ],
  security_fix: [
    'Add missing security headers',
    'Update outdated CMS version',
    'Harden login and admin access',
    'Before/after security report',
  ],
  full_bundle: [
    'Speed, security, and SEO fixes included',
    'Every audit issue addressed',
    'Before/after reports for all categories',
    'All fixes delivered within 48 hours',
  ],
};

const ENTITLEMENT_TO_SKU: Record<SiteFixEntitlement, SiteFixSKU> = {
  speed: 'speed_fix',
  security: 'security_fix',
  seo_ai_visibility: 'seo_ai_visibility_fix',
};

export function getFixItemsForOrder(
  sku: SiteFixSKU,
  entitlements: SiteFixEntitlement[]
): string[] {
  if (sku === 'full_bundle') {
    const items: string[] = [];
    for (const entitlement of entitlements) {
      items.push(...SITE_FIX_FEATURES[ENTITLEMENT_TO_SKU[entitlement]]);
    }
    return items;
  }

  return SITE_FIX_FEATURES[sku];
}
