import type { Timestamp } from 'firebase-admin/firestore';

export type AccessType = 'wp_admin' | 'hosting_panel' | 'sftp' | 'ftp';

export type SiteAccessRequestStatus =
  | 'pending'
  | 'granted'
  | 'declined'
  | 'expired'
  | 'revoked';

export type SiteAccessRequestDoc = {
  requestId: string;
  clientUid: string;
  sessionId: string;
  requestedAt: Timestamp;
  requestedBy: string;
  requestedByEmail: string;
  accessType: AccessType;
  scopeDescription: string;
  expiryDays: 1 | 3 | 7 | 14;
  expiresAt: Timestamp | null;
  status: SiteAccessRequestStatus;
  grantedAt: Timestamp | null;
  revokedAt: Timestamp | null;
  tokenHash: string;
  tokenUsed: boolean;
};

export type SiteAccessRequestPayload = {
  requestId: string;
  clientUid: string;
  sessionId: string;
  requestedAt: string;
  accessType: AccessType;
  scopeDescription: string;
  expiryDays: number;
  expiresAt: string | null;
  status: SiteAccessRequestStatus;
  grantedAt: string | null;
  revokedAt: string | null;
};
