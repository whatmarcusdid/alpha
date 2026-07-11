import { ALL_SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';

export function parseSkusParam(skusParam: string | null): SiteFixSKU[] {
  if (!skusParam?.trim()) {
    return ALL_SITE_FIX_SKUS;
  }

  const valid = new Set<SiteFixSKU>(ALL_SITE_FIX_SKUS);
  const parsed = skusParam
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is SiteFixSKU => valid.has(s as SiteFixSKU));

  return parsed.length > 0 ? parsed : ALL_SITE_FIX_SKUS;
}

/** SKUs shown on the packages picker — full_bundle deferred until bundle UI exists. */
export function getDisplaySkus(skus: SiteFixSKU[]): SiteFixSKU[] {
  return skus.filter((sku) => sku !== 'full_bundle');
}

export function isValidSiteFixSku(value: string): value is SiteFixSKU {
  return (ALL_SITE_FIX_SKUS as string[]).includes(value);
}
