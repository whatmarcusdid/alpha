export type SiteFixSKU =
  | 'speed_fix'
  | 'security_fix'
  | 'seo_ai_visibility_fix'
  | 'full_bundle';

export type SiteFixEntitlement = 'speed' | 'security' | 'seo_ai_visibility';

export const SITE_FIX_SKUS: Record<
  SiteFixSKU,
  { displayName: string; price: number | null }
> = {
  seo_ai_visibility_fix: {
    displayName: 'SEO & AI Visibility Fix',
    price: 679,
  },
  speed_fix: {
    displayName: 'Speed Fix',
    price: 799,
  },
  security_fix: {
    displayName: 'Security Fix',
    price: 999,
  },
  full_bundle: {
    displayName: 'Full Bundle',
    price: null,
  },
};

export const ALL_SITE_FIX_SKUS: SiteFixSKU[] = [
  'seo_ai_visibility_fix',
  'speed_fix',
  'security_fix',
  'full_bundle',
];

export function expandEntitlements(sku: SiteFixSKU): SiteFixEntitlement[] {
  switch (sku) {
    case 'full_bundle':
      return ['speed', 'security', 'seo_ai_visibility'];
    case 'speed_fix':
      return ['speed'];
    case 'security_fix':
      return ['security'];
    case 'seo_ai_visibility_fix':
      return ['seo_ai_visibility'];
    default: {
      const _exhaustive: never = sku;
      return _exhaustive;
    }
  }
}

function buildSkuPriceMap(): Record<SiteFixSKU, string> {
  const map: Record<SiteFixSKU, string | undefined> = {
    speed_fix: process.env.STRIPE_PRICE_SPEED_FIX,
    security_fix: process.env.STRIPE_PRICE_SECURITY_FIX,
    seo_ai_visibility_fix: process.env.STRIPE_PRICE_SEO_FIX,
    full_bundle: process.env.STRIPE_PRICE_FULL_BUNDLE,
  };

  const missing: string[] = [];
  for (const [sku, priceId] of Object.entries(map) as [SiteFixSKU, string | undefined][]) {
    if (!priceId) {
      missing.push(sku);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Book Service Stripe price env vars for: ${missing.join(', ')}. ` +
        'Set STRIPE_PRICE_SPEED_FIX, STRIPE_PRICE_SECURITY_FIX, STRIPE_PRICE_SEO_FIX, STRIPE_PRICE_FULL_BUNDLE.'
    );
  }

  return map as Record<SiteFixSKU, string>;
}

let skuPriceMapCache: Record<SiteFixSKU, string> | null = null;

/** Resolves SKU → Stripe Price ID from env. Throws if any env var is missing (fail fast). */
export function getSKUPriceMap(): Record<SiteFixSKU, string> {
  if (!skuPriceMapCache) {
    skuPriceMapCache = buildSkuPriceMap();
  }
  return skuPriceMapCache;
}

/** @deprecated Use getSKUPriceMap() — lazy singleton for server-side checkout */
export function getSKUPriceId(sku: SiteFixSKU): string {
  return getSKUPriceMap()[sku];
}
