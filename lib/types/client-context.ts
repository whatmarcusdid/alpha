export type SiteFixEntitlement = 'speed' | 'security' | 'seo_ai_visibility';

export type ClientContext = {
  userId: string;
  fullName: string;
  businessName: string;
  websiteUrl: string | null;
  email: string;
  entitlements: SiteFixEntitlement[];
  packageLabel: string | null;
  linkedFixSessionId: string | null;
};

export type ClientContextResult =
  | { status: 'found'; context: ClientContext }
  | { status: 'not_linked' }
  | { status: 'error'; message: string };
