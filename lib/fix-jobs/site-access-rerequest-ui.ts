import type { FixJobStage } from '@/lib/types/fix-session';
import type {
  SiteAccessRequestPayload,
  SiteAccessRequestStatus,
} from '@/lib/types/site-access-request';

export type SiteAccessDisplayStatus = SiteAccessRequestStatus | 'not_requested';

export function shouldShowSiteAccessReRequestModule(stage: FixJobStage): boolean {
  return (
    stage === 'ready' ||
    stage === 'in_progress' ||
    stage === 'qa' ||
    stage === 'report_ready'
  );
}

export function shouldShowReRequestButton(
  siteAccessRequest: SiteAccessRequestPayload | null
): boolean {
  if (!siteAccessRequest) {
    return true;
  }

  return (
    siteAccessRequest.status === 'expired' ||
    siteAccessRequest.status === 'declined' ||
    siteAccessRequest.status === 'revoked'
  );
}

export function shouldShowRevokeLink(
  siteAccessRequest: SiteAccessRequestPayload | null
): boolean {
  if (!siteAccessRequest) {
    return false;
  }

  return (
    siteAccessRequest.status === 'pending' || siteAccessRequest.status === 'granted'
  );
}

export function resolveSiteAccessDisplayStatus(
  siteAccessRequest: SiteAccessRequestPayload | null
): SiteAccessDisplayStatus {
  return siteAccessRequest?.status ?? 'not_requested';
}

export function getSiteAccessStatusChipClass(status: SiteAccessDisplayStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'granted':
      return 'bg-green-100 text-green-800';
    case 'expired':
    case 'declined':
      return 'bg-red-100 text-red-800';
    case 'revoked':
    case 'not_requested':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getSiteAccessStatusLabel(
  status: SiteAccessDisplayStatus,
  expiresAt: string | null
): string {
  switch (status) {
    case 'not_requested':
      return 'Access: Not re-requested';
    case 'pending':
      return 'Access: Re-request sent';
    case 'granted':
      return expiresAt
        ? `Access: Re-granted · expires ${formatShortDate(expiresAt)}`
        : 'Access: Re-granted';
    case 'expired':
      return 'Access: Expired';
    case 'revoked':
      return 'Access: Revoked';
    case 'declined':
      return 'Access: Declined by customer';
  }
}

function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isScopeDescriptionValid(scopeDescription: string): boolean {
  const trimmed = scopeDescription.trim();
  return trimmed.length >= 10 && trimmed.length <= 500;
}

export const ACCESS_TYPE_OPTIONS = [
  { value: 'wp_admin', label: 'WP Admin' },
  { value: 'hosting_panel', label: 'Hosting Panel' },
  { value: 'sftp', label: 'SFTP' },
  { value: 'ftp', label: 'FTP' },
] as const;

export const EXPIRY_DAY_OPTIONS = [1, 3, 7, 14] as const;
