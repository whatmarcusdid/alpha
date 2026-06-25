import type { SiteFixSKU } from './skus';

export const SITE_FIX_PRODUCT_TYPE = 'site_fix' as const;

export interface SiteFixSessionMetadata {
  productType: typeof SITE_FIX_PRODUCT_TYPE;
  orderId: string;
  auditLeadId: string;
  sku: SiteFixSKU;
  normalizedEmail: string;
}

export function buildSiteFixMetadata(
  params: Omit<SiteFixSessionMetadata, 'productType'>
): SiteFixSessionMetadata {
  return {
    productType: SITE_FIX_PRODUCT_TYPE,
    ...params,
  };
}

export function isSiteFixSession(
  metadata: Record<string, string> | null | undefined
): boolean {
  return metadata?.productType === SITE_FIX_PRODUCT_TYPE;
}

export function parseSiteFixSessionMetadata(
  metadata: Record<string, string> | null | undefined
): SiteFixSessionMetadata | null {
  if (!isSiteFixSession(metadata) || !metadata) {
    return null;
  }

  return {
    productType: SITE_FIX_PRODUCT_TYPE,
    orderId: metadata.orderId,
    auditLeadId: metadata.auditLeadId,
    sku: metadata.sku as SiteFixSKU,
    normalizedEmail: metadata.normalizedEmail,
  };
}
