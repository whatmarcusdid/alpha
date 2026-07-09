import type { CMSPlatform, HostingProvider } from '@/lib/types/hosting-context';

export const HOSTING_PROVIDER_OPTIONS: Array<{
  value: HostingProvider;
  label: string;
}> = [
  { value: 'godaddy_cpanel', label: 'GoDaddy cPanel' },
  { value: 'godaddy_managed', label: 'GoDaddy Managed WordPress' },
  { value: 'siteground', label: 'SiteGround' },
  { value: 'bluehost', label: 'Bluehost' },
  { value: 'kinsta', label: 'Kinsta' },
  { value: 'wpengine', label: 'WP Engine' },
  { value: 'flywheel', label: 'Flywheel' },
  { value: 'pressable', label: 'Pressable' },
  { value: 'cloudways', label: 'Cloudways' },
  { value: 'namecheap', label: 'Namecheap' },
  { value: 'hostgator', label: 'HostGator' },
  { value: 'dreamhost', label: 'DreamHost' },
  { value: 'other', label: 'Other (specify)' },
];

export const CMS_PLATFORM_OPTIONS: Array<{
  value: CMSPlatform;
  label: string;
}> = [
  { value: 'wordpress', label: 'WordPress' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'wix', label: 'Wix' },
  { value: 'webflow', label: 'Webflow' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'other', label: 'Other' },
];

export function getHostDisplayLabel(host: string, hostLabel?: string): string {
  if (host === 'other') {
    return hostLabel?.trim() || 'Other host';
  }

  const match = HOSTING_PROVIDER_OPTIONS.find((option) => option.value === host);
  return match?.label ?? host;
}

export function getCmsDisplayLabel(cms: string): string {
  const match = CMS_PLATFORM_OPTIONS.find((option) => option.value === cms);
  return match?.label ?? cms;
}

export function buildHostingContextSummary(params: {
  host: string;
  hostLabel?: string;
  cms: string;
  cmsVersion?: string;
  plugins: string[];
}): string {
  const hostLabel = getHostDisplayLabel(params.host, params.hostLabel);
  const cmsLabel = getCmsDisplayLabel(params.cms);
  const versionSuffix = params.cmsVersion?.trim() ? ` ${params.cmsVersion.trim()}` : '';
  const pluginSummary =
    params.plugins.length > 0 ? params.plugins.join(', ') : 'No plugins listed';

  return `${hostLabel} · ${cmsLabel}${versionSuffix} · ${pluginSummary}`;
}

export function getGeneratePlanTooltip(isConfirmed: boolean): string {
  if (!isConfirmed) {
    return 'Confirm hosting context above before generating an AI fix plan.';
  }

  return 'AI fix plans coming soon.';
}

export function addPluginTag(plugins: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return plugins;
  }

  if (plugins.some((plugin) => plugin.toLowerCase() === trimmed.toLowerCase())) {
    return plugins;
  }

  return [...plugins, trimmed];
}

export function removePluginTag(plugins: string[], value: string): string[] {
  return plugins.filter((plugin) => plugin !== value);
}

export function isHostingContextFormValid(params: {
  host: string;
  hostLabel?: string;
  cms: string;
}): boolean {
  if (!params.host.trim() || !params.cms.trim()) {
    return false;
  }

  if (params.host === 'other' && !params.hostLabel?.trim()) {
    return false;
  }

  return true;
}
