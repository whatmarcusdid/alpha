import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import type { HostingContextPayload } from '@/lib/types/hosting-context';

export type SubmitHostingContextInput = {
  fixJobId: string;
  uid: string;
  host: string;
  hostLabel?: string;
  cms: string;
  cmsVersion?: string;
  plugins: string[];
};

export type SubmitHostingContextResult =
  | { success: true; hostingContext: HostingContextPayload }
  | { success: false; error: string };

export async function submitHostingContextConfirm(
  input: SubmitHostingContextInput
): Promise<SubmitHostingContextResult> {
  const response = await fetchWithAdminAuth(
    `/api/admin/fix-jobs/${input.fixJobId}/hosting-context`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: input.uid,
        host: input.host,
        hostLabel: input.hostLabel,
        cms: input.cms,
        cmsVersion: input.cmsVersion,
        plugins: input.plugins,
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error:
        typeof payload.error === 'string'
          ? payload.error
          : 'Failed to confirm hosting context',
    };
  }

  return {
    success: true,
    hostingContext: payload.data.hostingContext as HostingContextPayload,
  };
}
