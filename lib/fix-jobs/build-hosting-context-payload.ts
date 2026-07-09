import 'server-only';

import { seedHostingContextFromOnboarding } from '@/lib/fix-jobs/seed-hosting-context';
import type { HostingContext, HostingContextPayload } from '@/lib/types/hosting-context';

function readHostingContextFromUserDoc(
  userDoc: Record<string, unknown>
): Partial<HostingContext> | null {
  const raw = userDoc.hostingContext;
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  return {
    host: typeof record.host === 'string' ? record.host : undefined,
    hostLabel: typeof record.hostLabel === 'string' ? record.hostLabel : undefined,
    cms: typeof record.cms === 'string' ? record.cms : undefined,
    cmsVersion: typeof record.cmsVersion === 'string' ? record.cmsVersion : undefined,
    plugins: Array.isArray(record.plugins)
      ? record.plugins.filter((item): item is string => typeof item === 'string')
      : [],
    confirmedAt:
      typeof record.confirmedAt === 'string' ? record.confirmedAt : undefined,
    confirmedBy:
      typeof record.confirmedBy === 'string' ? record.confirmedBy : undefined,
  };
}

export function buildHostingContextPayload(
  userDoc: Record<string, unknown>
): HostingContextPayload {
  const existing = readHostingContextFromUserDoc(userDoc);
  const seed = seedHostingContextFromOnboarding(userDoc);

  const merged: HostingContext = {
    host: existing?.host ?? seed.host ?? '',
    hostLabel: existing?.hostLabel ?? seed.hostLabel,
    cms: existing?.cms ?? seed.cms ?? '',
    cmsVersion: existing?.cmsVersion ?? seed.cmsVersion,
    plugins: existing?.plugins ?? seed.plugins ?? [],
    confirmedAt: existing?.confirmedAt,
    confirmedBy: existing?.confirmedBy,
  };

  return {
    ...merged,
    plugins: merged.plugins ?? [],
    isConfirmed: Boolean(merged.confirmedAt),
  };
}

export function serializeConfirmedHostingContext(
  input: HostingContext & { confirmedAt: string; confirmedBy: string }
): HostingContextPayload {
  return {
    ...input,
    plugins: input.plugins ?? [],
    isConfirmed: true,
  };
}
