import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import type { AccessType, SiteAccessRequestPayload } from '@/lib/types/site-access-request';

export type SubmitSiteAccessReRequestInput = {
  uid: string;
  sessionId: string;
  accessType: AccessType;
  scopeDescription: string;
  expiryDays: 1 | 3 | 7 | 14;
};

export type SubmitSiteAccessReRequestResult =
  | { success: true; request: SiteAccessRequestPayload }
  | { success: false; status: number; error: string };

export async function submitSiteAccessReRequest(
  input: SubmitSiteAccessReRequestInput
): Promise<SubmitSiteAccessReRequestResult> {
  const response = await fetchWithAdminAuth('/api/admin/site-access/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 409) {
    return {
      success: false,
      status: 409,
      error: 'A re-request is already pending for this job.',
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error:
        typeof payload.error === 'string' ? payload.error : 'Failed to send re-request',
    };
  }

  const requestId = payload.data?.requestId as string;

  return {
    success: true,
    request: {
      requestId,
      clientUid: input.uid,
      sessionId: input.sessionId,
      requestedAt: new Date().toISOString(),
      accessType: input.accessType,
      scopeDescription: input.scopeDescription,
      expiryDays: input.expiryDays,
      expiresAt: null,
      status: 'pending',
      grantedAt: null,
      revokedAt: null,
    },
  };
}

export async function revokeSiteAccessReRequest(params: {
  requestId: string;
  uid: string;
  current: SiteAccessRequestPayload;
}): Promise<
  | { success: true; request: SiteAccessRequestPayload }
  | { success: false; error: string }
> {
  const response = await fetchWithAdminAuth(
    `/api/admin/site-access/${params.requestId}/revoke`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: params.uid }),
    }
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error:
        typeof payload.error === 'string'
          ? payload.error
          : 'Failed to revoke access request',
    };
  }

  return {
    success: true,
    request: {
      ...params.current,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    },
  };
}
