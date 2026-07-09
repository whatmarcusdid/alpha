import 'server-only';

import type { CMSPlatform, HostingContext, HostingProvider } from '@/lib/types/hosting-context';

export type UserDocForHostingSeed = Record<string, unknown>;

const HOSTING_TEXT_ALIASES: Array<{ pattern: RegExp; host: HostingProvider }> = [
  { pattern: /godaddy.*managed/i, host: 'godaddy_managed' },
  { pattern: /godaddy|go\s*daddy/i, host: 'godaddy_cpanel' },
  { pattern: /siteground/i, host: 'siteground' },
  { pattern: /bluehost/i, host: 'bluehost' },
  { pattern: /kinsta/i, host: 'kinsta' },
  { pattern: /wp\s*engine/i, host: 'wpengine' },
  { pattern: /flywheel/i, host: 'flywheel' },
  { pattern: /pressable/i, host: 'pressable' },
  { pattern: /cloudways/i, host: 'cloudways' },
  { pattern: /namecheap/i, host: 'namecheap' },
  { pattern: /hostgator/i, host: 'hostgator' },
  { pattern: /dreamhost/i, host: 'dreamhost' },
];

function mapHostingProviderText(
  value: string
): Partial<Pick<HostingContext, 'host' | 'hostLabel'>> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  for (const alias of HOSTING_TEXT_ALIASES) {
    if (alias.pattern.test(trimmed)) {
      return { host: alias.host };
    }
  }

  return {
    host: 'other',
    hostLabel: trimmed,
  };
}

function mapAccessMethodToCms(method: string): CMSPlatform | undefined {
  const normalized = method.trim().toLowerCase();
  if (normalized.includes('wordpress') || normalized.includes('wp-admin')) {
    return 'wordpress';
  }

  return undefined;
}

export function seedHostingContextFromOnboarding(
  userDoc: UserDocForHostingSeed
): Partial<HostingContext> {
  try {
    const siteFix =
      userDoc.siteFix && typeof userDoc.siteFix === 'object'
        ? (userDoc.siteFix as Record<string, unknown>)
        : undefined;

    const accessRequest =
      siteFix?.access_request && typeof siteFix.access_request === 'object'
        ? (siteFix.access_request as Record<string, unknown>)
        : undefined;

    const seed: Partial<HostingContext> = {
      plugins: [],
    };

    const hostingProvider =
      typeof accessRequest?.hostingProvider === 'string'
        ? accessRequest.hostingProvider
        : '';

    if (hostingProvider) {
      Object.assign(seed, mapHostingProviderText(hostingProvider));
    }

    const accessMethod =
      typeof accessRequest?.method === 'string' ? accessRequest.method : '';

    if (accessMethod) {
      const cms = mapAccessMethodToCms(accessMethod);
      if (cms) {
        seed.cms = cms;
      }
    }

    if (!seed.cms && typeof siteFix?.websiteUrl === 'string' && siteFix.websiteUrl.trim()) {
      // Website URL is available on siteFix.websiteUrl but is not stored on hostingContext.
    }

    return seed;
  } catch {
    return { plugins: [] };
  }
}
