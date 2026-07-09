import type { FixPillar } from '@/lib/audit/fixPlaybook';
import type { PipelineResult } from '@/lib/audit/runAuditPipeline';
import type { AfterAuditSnapshot } from '@/lib/types/fix-session';
import { FieldValue } from 'firebase-admin/firestore';

export function buildAfterAuditSnapshotFromPipeline(
  pipeline: PipelineResult,
  pillarSelection: { speed: boolean; security: boolean; seo: boolean }
): Omit<AfterAuditSnapshot, 'capturedAt'> & {
  capturedAt: ReturnType<typeof FieldValue.serverTimestamp>;
} {
  return {
    capturedAt: FieldValue.serverTimestamp(),
    ...(pillarSelection.speed && pipeline.speed
      ? {
          speed: {
            grade: pipeline.speed.data?.grade ?? 'F',
            score: pipeline.speed.data?.score ?? 0,
            topIssues: pipeline.speed.data?.topIssues ?? [],
            status: pipeline.speed.status,
          },
        }
      : {}),
    ...(pillarSelection.security && pipeline.security
      ? {
          security: {
            grade: pipeline.security.data?.grade ?? 'F',
            flags: pipeline.security.data?.flags ?? [],
            flagTier: pipeline.security.data?.flagTier ?? 'none',
            status: pipeline.security.status,
          },
        }
      : {}),
    ...(pillarSelection.seo && pipeline.seo
      ? {
          seo: {
            grade: pipeline.seo.data?.grade ?? 'F',
            score: pipeline.seo.data?.score ?? 0,
            failingSignals: pipeline.seo.data?.failingSignals ?? [],
            status: pipeline.seo.status,
          },
        }
      : {}),
  };
}

export function pillarSelectionFromEntitlements(
  entitlements: FixPillar[]
): { speed: boolean; security: boolean; seo: boolean } {
  return {
    speed: entitlements.includes('speed'),
    security: entitlements.includes('security'),
    seo: entitlements.includes('seo_ai_visibility'),
  };
}
