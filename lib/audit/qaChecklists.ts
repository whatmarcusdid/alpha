import type { FixPillar } from '@/lib/audit/fixPlaybook';

export type QAItemKind = 'auto' | 'manual';

export type QAItemDef = {
  id: string;
  pillar: FixPillar;
  kind: QAItemKind;
  label: string;
  autoRule?: string;
};

export const QA_CHECKLISTS: Record<FixPillar, QAItemDef[]> = {
  speed: [
    {
      id: 'snapshot_fresh',
      pillar: 'speed',
      kind: 'auto',
      label: 'Checks run after all speed signals were completed',
      autoRule: 'snapshot_fresh',
    },
    {
      id: 'grade_improved',
      pillar: 'speed',
      kind: 'auto',
      label: 'Speed grade improved vs baseline',
      autoRule: 'grade_improved',
    },
    {
      id: 'signals_resolved',
      pillar: 'speed',
      kind: 'auto',
      label: 'All speed signals resolved',
      autoRule: 'signals_resolved',
    },
    {
      id: 'loads_correctly',
      pillar: 'speed',
      kind: 'manual',
      label:
        'Homepage and top service page load correctly on desktop and mobile',
    },
    {
      id: 'no_breakage',
      pillar: 'speed',
      kind: 'manual',
      label:
        'No functionality breakage from deferral/unloading (menus, forms, sliders)',
    },
  ],
  security: [
    {
      id: 'snapshot_fresh',
      pillar: 'security',
      kind: 'auto',
      label: 'Checks run after all security signals were completed',
      autoRule: 'snapshot_fresh',
    },
    {
      id: 'no_tier1_flags',
      pillar: 'security',
      kind: 'auto',
      label: 'No Tier 1 security flags in after-scan',
      autoRule: 'no_tier1_flags',
    },
    {
      id: 'flags_resolved',
      pillar: 'security',
      kind: 'auto',
      label: 'All security flags resolved',
      autoRule: 'flags_resolved',
    },
    {
      id: 'external_scan',
      pillar: 'security',
      kind: 'manual',
      label: 'Fresh external scan reviewed (Sucuri SiteCheck)',
    },
    {
      id: 'passwords_rotated',
      pillar: 'security',
      kind: 'manual',
      label:
        'Admin passwords rotated and salts regenerated where SOP required',
    },
    {
      id: 'gsc_review',
      pillar: 'security',
      kind: 'manual',
      label:
        'Google Search Console review requested if site was blacklisted',
    },
  ],
  seo_ai_visibility: [
    {
      id: 'snapshot_fresh',
      pillar: 'seo_ai_visibility',
      kind: 'auto',
      label: 'Checks run after all SEO signals were completed',
      autoRule: 'snapshot_fresh',
    },
    {
      id: 'grade_improved',
      pillar: 'seo_ai_visibility',
      kind: 'auto',
      label: 'SEO grade improved vs baseline',
      autoRule: 'grade_improved',
    },
    {
      id: 'signals_resolved',
      pillar: 'seo_ai_visibility',
      kind: 'auto',
      label: 'All SEO signals resolved',
      autoRule: 'signals_resolved',
    },
    {
      id: 'visual_review',
      pillar: 'seo_ai_visibility',
      kind: 'manual',
      label:
        'Key pages visually reviewed — headings and content changes render correctly',
    },
    {
      id: 'schema_validated',
      pillar: 'seo_ai_visibility',
      kind: 'manual',
      label:
        'Schema validated in Rich Results Test where schema was added',
    },
  ],
};

export function getManualQAItem(
  pillar: FixPillar,
  itemId: string
): QAItemDef | undefined {
  return QA_CHECKLISTS[pillar].find(
    (item) => item.id === itemId && item.kind === 'manual'
  );
}
