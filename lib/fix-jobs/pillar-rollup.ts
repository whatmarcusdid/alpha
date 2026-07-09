import type { FixPillar } from '@/lib/audit/fixPlaybook';
import { derivePillarClientStatus } from '@/lib/fix-jobs/helpers';
import type { FixSessionDoc, PillarClientStatus } from '@/lib/types/fix-session';

export type ClientDashboardPillarKey = 'speed' | 'security' | 'seo';

export function fixPillarToClientKey(pillar: FixPillar): ClientDashboardPillarKey {
  if (pillar === 'seo_ai_visibility') {
    return 'seo';
  }

  return pillar;
}

export type ClientPillarProgressDoc = {
  status: PillarClientStatus;
  description: string | null;
  updatedAt: unknown;
  completedAt: unknown | null;
};

export function buildClientPillarProgress(
  session: FixSessionDoc,
  pillar: FixPillar
): Omit<ClientPillarProgressDoc, 'updatedAt'> & { updatedAt?: unknown } {
  const clientKey = fixPillarToClientKey(pillar);
  const status = derivePillarClientStatus(session, pillar);
  const existing = session.fixProgress?.[clientKey];
  const existingRecord =
    existing && typeof existing === 'object' && !('completedStepIds' in existing)
      ? (existing as Record<string, unknown>)
      : undefined;

  const previousCompletedAt = existingRecord?.completedAt ?? null;

  return {
    status,
    description:
      typeof existingRecord?.description === 'string'
        ? existingRecord.description
        : null,
    completedAt:
      status === 'done' && previousCompletedAt == null
        ? null
        : (previousCompletedAt ?? null),
  };
}
