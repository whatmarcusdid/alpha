import type { FixJobStage } from '@/lib/types/fix-session';

export const STAGE_LABELS: Record<FixJobStage, string> = {
  awaiting_access: 'Awaiting Access',
  ready: 'Ready',
  in_progress: 'In Progress',
  qa: 'QA',
  report_ready: 'Report Ready',
  delivered: 'Delivered',
};

export const STAGE_BADGE_CLASS: Record<FixJobStage, string> = {
  awaiting_access: 'bg-amber-100 text-amber-800',
  ready: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-blue-100 text-blue-800',
  qa: 'bg-purple-100 text-purple-800',
  report_ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-600',
};

export const PILLAR_CHIP_CLASS: Record<string, string> = {
  speed: 'bg-blue-100 text-blue-800',
  security: 'bg-amber-100 text-amber-800',
  seo_ai_visibility: 'bg-purple-100 text-purple-800',
};

export const PILLAR_CHIP_LABEL: Record<string, string> = {
  speed: 'SPD',
  security: 'SEC',
  seo_ai_visibility: 'SEO',
};
