import { z } from 'zod';

export const RequestSiteAccessSchema = z.object({
  uid: z.string().min(1),
  sessionId: z.string().min(1),
  accessType: z.enum(['wp_admin', 'hosting_panel', 'sftp', 'ftp']),
  scopeDescription: z.string().min(10).max(500),
  expiryDays: z
    .union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)])
    .default(7),
});

export const GrantDeclineAccessSchema = z.object({
  token: z.string().min(1),
});

export const RevokeAccessSchema = z.object({
  uid: z.string().min(1),
});
