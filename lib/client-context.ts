import { adminDb } from '@/lib/firebase/admin';
import { expandEntitlements, SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';
import type { ClientContext, ClientContextResult, SiteFixEntitlement } from '@/lib/types/client-context';

const VALID_ENTITLEMENTS: SiteFixEntitlement[] = ['speed', 'security', 'seo_ai_visibility'];

const VALID_SKUS: SiteFixSKU[] = [
  'speed_fix',
  'security_fix',
  'seo_ai_visibility_fix',
  'full_bundle',
];

function isSiteFixSKU(value: unknown): value is SiteFixSKU {
  return typeof value === 'string' && VALID_SKUS.includes(value as SiteFixSKU);
}

function parseEntitlementsFromSiteFix(siteFix: Record<string, unknown>): SiteFixEntitlement[] {
  const sku = siteFix.sku;
  if (isSiteFixSKU(sku)) {
    return expandEntitlements(sku);
  }

  if (!Array.isArray(siteFix.entitlements)) {
    return [];
  }

  return siteFix.entitlements.filter(
    (value): value is SiteFixEntitlement =>
      typeof value === 'string' && VALID_ENTITLEMENTS.includes(value as SiteFixEntitlement)
  );
}

function parsePackageLabel(siteFix: Record<string, unknown>): string | null {
  const sku = siteFix.sku;
  if (!isSiteFixSKU(sku)) {
    return null;
  }

  return SITE_FIX_SKUS[sku].displayName;
}

function parseLinkedFixSessionId(siteFix: Record<string, unknown>): string | null {
  const sessionId = siteFix.activeFixSessionId;
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
}

function mapUserDocToClientContext(
  userId: string,
  data: Record<string, unknown>
): ClientContext {
  const company =
    data.company && typeof data.company === 'object'
      ? (data.company as Record<string, unknown>)
      : {};

  const siteFix =
    data.siteFix && typeof data.siteFix === 'object'
      ? (data.siteFix as Record<string, unknown>)
      : null;

  const businessName =
    typeof company.legalName === 'string' ? company.legalName : '';

  const websiteUrl =
    typeof company.websiteUrl === 'string' && company.websiteUrl.length > 0
      ? company.websiteUrl
      : null;

  return {
    userId,
    fullName: typeof data.fullName === 'string' ? data.fullName : '',
    businessName,
    websiteUrl,
    email: typeof data.email === 'string' ? data.email : '',
    entitlements: siteFix ? parseEntitlementsFromSiteFix(siteFix) : [],
    packageLabel: siteFix ? parsePackageLabel(siteFix) : null,
    linkedFixSessionId: siteFix ? parseLinkedFixSessionId(siteFix) : null,
  };
}

export async function getClientContext(userId: string): Promise<ClientContextResult> {
  if (!adminDb) {
    return { status: 'error', message: 'Firebase Admin not initialized' };
  }

  try {
    const snapshot = await adminDb.collection('users').doc(userId).get();

    if (!snapshot.exists) {
      return { status: 'not_linked' };
    }

    const data = snapshot.data();
    if (!data || data.siteFix == null) {
      return { status: 'not_linked' };
    }

    return {
      status: 'found',
      context: mapUserDocToClientContext(userId, data as Record<string, unknown>),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load client context';
    return { status: 'error', message };
  }
}
