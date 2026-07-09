export type HostingProvider =
  | 'godaddy_cpanel'
  | 'godaddy_managed'
  | 'siteground'
  | 'bluehost'
  | 'kinsta'
  | 'wpengine'
  | 'flywheel'
  | 'pressable'
  | 'cloudways'
  | 'namecheap'
  | 'hostgator'
  | 'dreamhost'
  | 'other';

export type CMSPlatform =
  | 'wordpress'
  | 'squarespace'
  | 'wix'
  | 'webflow'
  | 'shopify'
  | 'other';

export type HostingContext = {
  host: HostingProvider | string;
  hostLabel?: string;
  cms: CMSPlatform | string;
  cmsVersion?: string;
  plugins: string[];
  confirmedAt?: string;
  confirmedBy?: string;
};

export type HostingContextPayload = HostingContext & {
  isConfirmed: boolean;
};
