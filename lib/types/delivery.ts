export type CredentialType = 'wordpress_admin' | 'cpanel' | 'sftp';

export type FixJobReportDoc = {
  reportId: string;
  fixJobId: string;
  status: 'generated' | 'sent';
  generatedAt: Date;
  sentAt: Date | null;
  previewUrl: string;
  filename: string;
  fileSizeBytes: number;
};

export type AccessRevocationDoc = {
  credentialType: CredentialType;
  revokedAt: Date;
  revokedBy: string;
};

export type SerializedAccessRevocationDoc = Omit<AccessRevocationDoc, 'revokedAt'> & {
  revokedAt: string;
};

export type CredentialDisplayRow = {
  credentialType: CredentialType;
  label: string;
  granted: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
};

export const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  wordpress_admin: 'WordPress admin',
  cpanel: 'cPanel',
  sftp: 'SFTP',
};

export const CREDENTIAL_TYPES: CredentialType[] = [
  'wordpress_admin',
  'cpanel',
  'sftp',
];
