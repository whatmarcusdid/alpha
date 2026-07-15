import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { SpeedTopIssueKey } from '@/lib/audit/speedTopIssues';
import type { SecurityFlag } from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';
import type { SiteFixEntitlement, SiteFixSKU } from '@/lib/book-service/skus';
import type { AuditLeadDoc } from '@/lib/types/audit';

export const PRODUCTION_PROJECT_IDS = ['tradesitegenie-prod'] as const;

export type PillarsFlag = 'speed' | 'security' | 'seo' | 'full';

export const PILLAR_MAP: Record<PillarsFlag, SiteFixEntitlement[]> = {
  speed: ['speed'],
  security: ['security'],
  seo: ['seo_ai_visibility'],
  full: ['speed', 'security', 'seo_ai_visibility'],
};

const FULL_SPEED_ISSUES: SpeedTopIssueKey[] = [
  'oversized_images',
  'render_blocking_resources',
  'unused_css_js',
  'slow_server_response',
];

const FULL_SECURITY_FLAGS: SecurityFlag[] = ['blacklisted', 'missing_security_headers'];

const FULL_SEO_SIGNALS: SeoFailingSignalKey[] = [
  'missing_title_tag',
  'weak_heading_structure',
  'no_faq_content',
  'missing_alt_text',
  'no_schema',
  'weak_location_specificity',
];

export type SeedCliArgs = {
  pillars: PillarsFlag;
  withAccess: boolean;
};

export function loadDotEnvFile(relativePath: string): void {
  const filePath = resolve(process.cwd(), relativePath);

  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value.replace(/\\n/g, '\n');
    }
  }
}

export function assertNotProductionProject(projectId: string): void {
  if (PRODUCTION_PROJECT_IDS.includes(projectId as (typeof PRODUCTION_PROJECT_IDS)[number])) {
    console.error('❌ Refusing to seed: connected to production project', projectId);
    process.exit(1);
  }
}

export function parseSeedCliArgs(argv: string[]): SeedCliArgs {
  let pillars: PillarsFlag = 'full';
  let withAccess = false;

  for (const arg of argv) {
    if (arg === '--with-access') {
      withAccess = true;
      continue;
    }

    if (arg.startsWith('--pillars=')) {
      const value = arg.slice('--pillars='.length) as PillarsFlag;
      if (!(value in PILLAR_MAP)) {
        console.error(`Invalid --pillars value: ${value}`);
        console.error('Expected: speed | security | seo | full');
        process.exit(1);
      }
      pillars = value;
    }
  }

  return { pillars, withAccess };
}

export function pillarsToSku(pillars: PillarsFlag): SiteFixSKU {
  switch (pillars) {
    case 'full':
      return 'full_bundle';
    case 'speed':
      return 'speed_fix';
    case 'security':
      return 'security_fix';
    case 'seo':
      return 'seo_ai_visibility_fix';
  }
}

export function filterAuditSignalsForEntitlements(
  entitlements: SiteFixEntitlement[]
): {
  speedTopIssues: SpeedTopIssueKey[];
  securityFlags: SecurityFlag[];
  seoFailingSignals: SeoFailingSignalKey[];
} {
  return {
    speedTopIssues: entitlements.includes('speed') ? FULL_SPEED_ISSUES : [],
    securityFlags: entitlements.includes('security') ? FULL_SECURITY_FLAGS : [],
    seoFailingSignals: entitlements.includes('seo_ai_visibility') ? FULL_SEO_SIGNALS : [],
  };
}

export function buildSeedAuditLeadDoc(params: {
  auditLeadId: string;
  email: string;
  entitlements: SiteFixEntitlement[];
}): AuditLeadDoc {
  const signals = filterAuditSignalsForEntitlements(params.entitlements);

  return {
    auditLeadId: params.auditLeadId,
    firstName: 'Seed',
    businessName: 'Seed Trade Co',
    email: params.email,
    websiteUrl: 'https://example-trade.com',
    source: 'public_audit',
    schemaVersion: 'v2',
    timestamp: null as unknown as AuditLeadDoc['timestamp'],
    auditStatus: 'completed',
    speedGrade: entitlementsIncludeSpeed(params.entitlements) ? 'F' : 'A',
    speedScore: entitlementsIncludeSpeed(params.entitlements) ? 18 : 95,
    speedTopIssues: signals.speedTopIssues,
    speedNarrative: 'This site loads very slowly due to unoptimized assets and render-blocking resources.',
    speedStatus: 'completed',
    securityGrade: entitlementsIncludeSecurity(params.entitlements) ? 'F' : 'A',
    securityFlags: signals.securityFlags,
    securityFlagTier: entitlementsIncludeSecurity(params.entitlements) ? 'tier1' : 'none',
    securityNarrative: 'This site has critical security issues that need immediate attention.',
    securityStatus: 'completed',
    seoGrade: entitlementsIncludeSeo(params.entitlements) ? 'D' : 'A',
    seoScore: entitlementsIncludeSeo(params.entitlements) ? 3 : 90,
    seoFailingSignals: signals.seoFailingSignals,
    seoNarrative: 'This site has significant SEO gaps affecting visibility in search and AI results.',
    seoStatus: 'completed',
  };
}

function entitlementsIncludeSpeed(entitlements: SiteFixEntitlement[]): boolean {
  return entitlements.includes('speed');
}

function entitlementsIncludeSecurity(entitlements: SiteFixEntitlement[]): boolean {
  return entitlements.includes('security');
}

function entitlementsIncludeSeo(entitlements: SiteFixEntitlement[]): boolean {
  return entitlements.includes('seo_ai_visibility');
}
