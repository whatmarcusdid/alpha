import type { PipelineResult } from '@/lib/audit/runAuditPipeline';
import type {
  Grade,
  SecurityFlag,
  SecurityFlagTier,
  SpeedTopIssueKey,
} from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';

export type AuditPillarState = {
  speedGrade: Grade;
  speedScore: number;
  speedTopIssues: SpeedTopIssueKey[];
  speedStatus: 'completed' | 'failed';
  securityGrade: Grade;
  securityFlags: SecurityFlag[];
  securityFlagTier: SecurityFlagTier;
  securityStatus: 'completed' | 'failed';
  seoGrade: Grade;
  seoScore: number;
  seoFailingSignals: SeoFailingSignalKey[];
  seoStatus: 'completed' | 'failed';
};

export function applyPipelineToAuditState(
  pipeline: PipelineResult
): AuditPillarState {
  const state: AuditPillarState = {
    speedGrade: 'F',
    speedScore: 0,
    speedTopIssues: [],
    speedStatus: 'failed',
    securityGrade: 'F',
    securityFlags: [],
    securityFlagTier: 'none',
    securityStatus: 'failed',
    seoGrade: 'F',
    seoScore: 0,
    seoFailingSignals: [],
    seoStatus: 'failed',
  };

  if (pipeline.speed?.status === 'completed' && pipeline.speed.data) {
    state.speedGrade = pipeline.speed.data.grade as Grade;
    state.speedScore = pipeline.speed.data.score;
    state.speedTopIssues = pipeline.speed.data.topIssues as SpeedTopIssueKey[];
    state.speedStatus = 'completed';
  }

  if (pipeline.security?.status === 'completed' && pipeline.security.data) {
    state.securityGrade = pipeline.security.data.grade as Grade;
    state.securityFlags = pipeline.security.data.flags as SecurityFlag[];
    state.securityFlagTier = pipeline.security.data.flagTier as SecurityFlagTier;
    state.securityStatus = 'completed';
  }

  if (pipeline.seo?.status === 'completed' && pipeline.seo.data) {
    state.seoGrade = pipeline.seo.data.grade as Grade;
    state.seoScore = pipeline.seo.data.score;
    state.seoFailingSignals = pipeline.seo.data
      .failingSignals as SeoFailingSignalKey[];
    state.seoStatus = 'completed';
  }

  return state;
}

export function deriveAuditStatus(state: AuditPillarState): 'completed' | 'partial' {
  return [state.speedStatus, state.securityStatus, state.seoStatus].every(
    (status) => status === 'completed'
  )
    ? 'completed'
    : 'partial';
}
