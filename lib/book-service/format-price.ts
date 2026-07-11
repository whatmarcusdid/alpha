import { SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';

export function formatSiteFixPrice(sku: SiteFixSKU): string | null {
  const price = SITE_FIX_SKUS[sku].price;
  if (price === null) {
    return null;
  }
  return `$${price.toLocaleString('en-US')}`;
}
