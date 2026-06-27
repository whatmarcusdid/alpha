import { fetchWithAdminAuth } from '@/lib/admin/fetch-with-auth';
import type { SerializedFixJob } from '@/lib/fix-jobs/serialize';

export async function patchFixJob(
  fixJobId: string,
  body: Record<string, unknown>
): Promise<SerializedFixJob> {
  const response = await fetchWithAdminAuth(`/api/admin/fix-jobs/${fixJobId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to update fix job');
  }

  return payload.data as SerializedFixJob;
}
