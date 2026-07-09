import 'server-only';

import type { AccessType } from '@/lib/types/site-access-request';

const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  wp_admin: 'WordPress admin',
  hosting_panel: 'Hosting control panel',
  sftp: 'SFTP',
  ftp: 'FTP',
};

function formatAccessType(accessType: string): string {
  if (accessType in ACCESS_TYPE_LABELS) {
    return ACCESS_TYPE_LABELS[accessType as AccessType];
  }

  return accessType;
}

export async function sendAccessReRequestEmail(params: {
  recipientEmail: string;
  customerName: string;
  businessName: string;
  scopeDescription: string;
  accessType: string;
  grantUrl: string;
  declineUrl: string;
  expiryDays: number;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_ACCESS_REREQUEST_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping access re-request email');
    return;
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Loops] LOOPS_ACCESS_REREQUEST_TEMPLATE_ID not configured — skipping access re-request email'
    );
    return;
  }

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.recipientEmail,
      dataVariables: {
        customerName: params.customerName || 'there',
        businessName: params.businessName,
        scopeDescription: params.scopeDescription,
        accessType: formatAccessType(params.accessType),
        grantUrl: params.grantUrl,
        declineUrl: params.declineUrl,
        expiryDays: String(params.expiryDays),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}

export async function sendAccessGrantedNotificationEmail(params: {
  adminEmail: string;
  customerName: string;
  businessName: string;
  sessionId: string;
  accessType: string;
  expiresAt: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_ACCESS_GRANTED_ADMIN_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping access granted admin email');
    return;
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Loops] LOOPS_ACCESS_GRANTED_ADMIN_TEMPLATE_ID not configured — skipping access granted admin email'
    );
    return;
  }

  if (!params.adminEmail) {
    console.warn('[Loops] Admin email missing — skipping access granted admin email');
    return;
  }

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.adminEmail,
      dataVariables: {
        customerName: params.customerName,
        businessName: params.businessName,
        sessionId: params.sessionId,
        accessType: formatAccessType(params.accessType),
        expiresAt: params.expiresAt,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}
