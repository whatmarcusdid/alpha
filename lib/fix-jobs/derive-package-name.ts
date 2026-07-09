import type { FixPillar } from '@/lib/audit/fixPlaybook';
import { getEntitlementDisplayName } from '@/lib/book-service/entitlement-labels';
import type { SiteFixEntitlement } from '@/lib/book-service/skus';

export function derivePackageName(entitlements: FixPillar[]): string {
  if (entitlements.length === 3) {
    return 'Full Bundle';
  }

  if (entitlements.length === 1) {
    return getEntitlementDisplayName(entitlements[0] as SiteFixEntitlement);
  }

  const shortNames = entitlements.map((pillar) =>
    getEntitlementDisplayName(pillar as SiteFixEntitlement).replace(' Fix', '')
  );

  return `${shortNames.join(' + ')} Fix`;
}
