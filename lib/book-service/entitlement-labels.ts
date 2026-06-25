import type { SiteFixEntitlement } from './skus';

const ENTITLEMENT_DISPLAY_NAMES: Record<SiteFixEntitlement, string> = {
  speed: 'Speed Fix',
  security: 'Security Fix',
  seo_ai_visibility: 'SEO & AI Visibility Fix',
};

export function formatEntitlementLabels(
  entitlements: SiteFixEntitlement[]
): string {
  return entitlements.map((e) => ENTITLEMENT_DISPLAY_NAMES[e]).join(', ');
}

export function getEntitlementDisplayName(
  entitlement: SiteFixEntitlement
): string {
  return ENTITLEMENT_DISPLAY_NAMES[entitlement];
}
