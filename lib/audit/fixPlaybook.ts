import {
  PHASE_0_PRECONDITIONS as PHASE_0_PRECONDITIONS_SOURCE,
  SECURITY_CONTENT,
  SPEED_CONTENT,
} from '@/lib/audit/fixPlaybook.content'
import { SEO_CONTENT } from '@/lib/audit/fixPlaybook.seo.content'
import type { SpeedTopIssueKey } from '@/lib/audit/speedTopIssues'
import { SPEED_ISSUE_DISPLAY_NAMES } from '@/lib/audit/speedTopIssues'
import type { SecurityFlag } from '@/lib/types/audit'
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals'
import { SEO_SIGNAL_DISPLAY_NAMES } from '@/lib/types/seoSignals'

export type FixPillar = 'speed' | 'security' | 'seo_ai_visibility'

export type AllFixSignalKey =
  | SpeedTopIssueKey
  | SecurityFlag
  | SeoFailingSignalKey

export type PlaybookStep = {
  id: string
  instruction: string
  accessNeeded: 'wp_admin' | 'hosting_panel' | 'sftp' | 'external_tool' | 'none'
  tools?: string[]
}

export type PlaybookEntry = {
  signalKey: AllFixSignalKey
  pillar: FixPillar
  title: string
  severity: 'critical' | 'high' | 'moderate'
  sopReference: string
  steps: PlaybookStep[]
  verification: string
  clientSummaryTemplate: string
  estimatedMinutes: number
}

export const PHASE_0_PRECONDITIONS: PlaybookStep[] =
  PHASE_0_PRECONDITIONS_SOURCE as PlaybookStep[]

type ContentFields = {
  sopReference: string
  steps: PlaybookStep[]
  verification: string
  clientSummaryTemplate: string
  estimatedMinutes: number
}

const SECURITY_TITLES: Record<SecurityFlag, string> = {
  malware_detected: 'Malware detected on site',
  blacklisted: 'Site appears on security blacklists',
  phishing_detected: 'Phishing content detected',
  unwanted_software_detected: 'Unwanted software detected',
  no_https: 'Site is not served over HTTPS',
  invalid_ssl: 'SSL certificate is invalid or expired',
  missing_security_headers: 'Security headers are missing or incomplete',
  outdated_cms: 'CMS, plugins, or themes are outdated',
  http_redirect_missing: 'HTTP to HTTPS redirect is missing',
  mixed_content: 'Mixed HTTP/HTTPS content detected',
}

const SECURITY_SEVERITY: Record<SecurityFlag, PlaybookEntry['severity']> = {
  malware_detected: 'critical',
  blacklisted: 'critical',
  phishing_detected: 'critical',
  unwanted_software_detected: 'critical',
  no_https: 'critical',
  invalid_ssl: 'high',
  missing_security_headers: 'moderate',
  outdated_cms: 'moderate',
  http_redirect_missing: 'moderate',
  mixed_content: 'moderate',
}

const SPEED_SEVERITY: Record<SpeedTopIssueKey, PlaybookEntry['severity']> = {
  render_blocking_resources: 'high',
  oversized_images: 'high',
  slow_server_response: 'high',
  unused_css_js: 'moderate',
  unminified_css_js: 'moderate',
  missing_compression: 'moderate',
  no_cache_headers: 'moderate',
  heavy_third_party_scripts: 'moderate',
}

const SEO_SEVERITY: Record<SeoFailingSignalKey, PlaybookEntry['severity']> = {
  missing_title_tag: 'high',
  missing_h1: 'high',
  missing_meta_description: 'high',
  weak_title_tag: 'moderate',
  weak_meta_description: 'moderate',
  weak_h1: 'moderate',
  multiple_h1: 'moderate',
  weak_heading_structure: 'moderate',
  thin_service_content: 'moderate',
  weak_location_specificity: 'moderate',
  no_faq_content: 'moderate',
  no_schema: 'moderate',
  invalid_schema: 'moderate',
  weak_internal_linking: 'moderate',
  missing_alt_text: 'moderate',
  not_indexable: 'moderate',
  missing_sitemap: 'moderate',
  missing_robots_txt: 'moderate',
  slow_page_speed: 'moderate',
  orphan_pages: 'moderate',
  broken_internal_links: 'moderate',
}

function buildEntry(
  signalKey: AllFixSignalKey,
  pillar: FixPillar,
  title: string,
  severity: PlaybookEntry['severity'],
  content: ContentFields
): PlaybookEntry {
  return {
    signalKey,
    pillar,
    title,
    severity,
    sopReference: content.sopReference,
    steps: content.steps,
    verification: content.verification,
    clientSummaryTemplate: content.clientSummaryTemplate,
    estimatedMinutes: content.estimatedMinutes,
  }
}

function speedEntry(key: SpeedTopIssueKey): PlaybookEntry {
  return buildEntry(
    key,
    'speed',
    SPEED_ISSUE_DISPLAY_NAMES[key],
    SPEED_SEVERITY[key],
    SPEED_CONTENT[key] as ContentFields
  )
}

function securityEntry(key: SecurityFlag): PlaybookEntry {
  return buildEntry(
    key,
    'security',
    SECURITY_TITLES[key],
    SECURITY_SEVERITY[key],
    SECURITY_CONTENT[key] as ContentFields
  )
}

function seoEntry(key: SeoFailingSignalKey): PlaybookEntry {
  return buildEntry(
    key,
    'seo_ai_visibility',
    SEO_SIGNAL_DISPLAY_NAMES[key],
    SEO_SEVERITY[key],
    SEO_CONTENT[key] as ContentFields
  )
}

export const FIX_PLAYBOOK: Record<AllFixSignalKey, PlaybookEntry> = {
  // Speed (8)
  render_blocking_resources: speedEntry('render_blocking_resources'),
  unused_css_js: speedEntry('unused_css_js'),
  oversized_images: speedEntry('oversized_images'),
  missing_compression: speedEntry('missing_compression'),
  no_cache_headers: speedEntry('no_cache_headers'),
  slow_server_response: speedEntry('slow_server_response'),
  heavy_third_party_scripts: speedEntry('heavy_third_party_scripts'),
  unminified_css_js: speedEntry('unminified_css_js'),

  // Security (10)
  malware_detected: securityEntry('malware_detected'),
  blacklisted: securityEntry('blacklisted'),
  phishing_detected: securityEntry('phishing_detected'),
  unwanted_software_detected: securityEntry('unwanted_software_detected'),
  no_https: securityEntry('no_https'),
  invalid_ssl: securityEntry('invalid_ssl'),
  missing_security_headers: securityEntry('missing_security_headers'),
  outdated_cms: securityEntry('outdated_cms'),
  http_redirect_missing: securityEntry('http_redirect_missing'),
  mixed_content: securityEntry('mixed_content'),

  // SEO (21)
  missing_title_tag: seoEntry('missing_title_tag'),
  weak_title_tag: seoEntry('weak_title_tag'),
  missing_meta_description: seoEntry('missing_meta_description'),
  weak_meta_description: seoEntry('weak_meta_description'),
  missing_h1: seoEntry('missing_h1'),
  weak_h1: seoEntry('weak_h1'),
  multiple_h1: seoEntry('multiple_h1'),
  weak_heading_structure: seoEntry('weak_heading_structure'),
  thin_service_content: seoEntry('thin_service_content'),
  weak_location_specificity: seoEntry('weak_location_specificity'),
  no_faq_content: seoEntry('no_faq_content'),
  no_schema: seoEntry('no_schema'),
  invalid_schema: seoEntry('invalid_schema'),
  weak_internal_linking: seoEntry('weak_internal_linking'),
  missing_alt_text: seoEntry('missing_alt_text'),
  not_indexable: seoEntry('not_indexable'),
  missing_sitemap: seoEntry('missing_sitemap'),
  missing_robots_txt: seoEntry('missing_robots_txt'),
  slow_page_speed: seoEntry('slow_page_speed'),
  orphan_pages: seoEntry('orphan_pages'),
  broken_internal_links: seoEntry('broken_internal_links'),
}

export function getPlaybookEntry(key: AllFixSignalKey): PlaybookEntry {
  return FIX_PLAYBOOK[key]
}

export function getPlaybookEntriesForPillar(pillar: FixPillar): PlaybookEntry[] {
  return Object.values(FIX_PLAYBOOK).filter((entry) => entry.pillar === pillar)
}

export function getPillarForSignal(key: AllFixSignalKey): FixPillar {
  return FIX_PLAYBOOK[key].pillar
}
