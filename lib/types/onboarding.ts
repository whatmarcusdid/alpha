export type AccessItemStatus = 'provided' | 'confirmed' | 'needed' | 'not_needed' | null;

export type OnboardingData = {
  siteUrl: AccessItemStatus;
  hostingAccess: AccessItemStatus;
  cmsAccess: AccessItemStatus;
  dnsAccess: AccessItemStatus;
  analyticsAccess: AccessItemStatus;
};

export const ONBOARDING_FIELDS: Array<{
  key: keyof OnboardingData;
  label: string;
  optional?: boolean;
}> = [
  { key: 'siteUrl', label: 'Site URL confirmed' },
  { key: 'hostingAccess', label: 'Hosting access' },
  { key: 'cmsAccess', label: 'CMS / WordPress access' },
  { key: 'dnsAccess', label: 'Domain / DNS access' },
  { key: 'analyticsAccess', label: 'Analytics access (optional)', optional: true },
];

export const REQUIRED_ONBOARDING_KEYS: Array<keyof OnboardingData> = [
  'siteUrl',
  'hostingAccess',
  'cmsAccess',
  'dnsAccess',
];

export function hasAnyOnboardingField(onboarding: OnboardingData): boolean {
  return Object.values(onboarding).some((value) => value != null);
}

export function isOnboardingItemSatisfied(status: AccessItemStatus): boolean {
  return status === 'provided' || status === 'confirmed' || status === 'not_needed';
}

export function getReadinessBadge(
  onboarding: OnboardingData
): 'ready' | 'action' | null {
  if (!hasAnyOnboardingField(onboarding)) {
    return null;
  }

  const requiredNonNull = REQUIRED_ONBOARDING_KEYS.map((key) => onboarding[key]).filter(
    (status): status is NonNullable<AccessItemStatus> => status != null
  );

  if (requiredNonNull.length === 0) {
    return null;
  }

  if (requiredNonNull.some((status) => status === 'needed')) {
    return 'action';
  }

  if (requiredNonNull.every((status) => isOnboardingItemSatisfied(status))) {
    return 'ready';
  }

  return null;
}

function parseStatus(value: unknown, allowed: readonly string[]): AccessItemStatus {
  if (typeof value === 'string' && allowed.includes(value)) {
    return value as AccessItemStatus;
  }

  return null;
}

export function mapOnboardingData(data: unknown): OnboardingData | null {
  if (data == null || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  return {
    siteUrl: parseStatus(record.siteUrl, ['confirmed', 'needed']),
    hostingAccess: parseStatus(record.hostingAccess, ['provided', 'needed', 'not_needed']),
    cmsAccess: parseStatus(record.cmsAccess, ['provided', 'needed', 'not_needed']),
    dnsAccess: parseStatus(record.dnsAccess, ['provided', 'needed', 'not_needed']),
    analyticsAccess: parseStatus(record.analyticsAccess, ['provided', 'needed', 'not_needed']),
  };
}
