export type SeoFailingSignalKey =
  | 'missing_title_tag'
  | 'weak_title_tag'
  | 'missing_meta_description'
  | 'weak_meta_description'
  | 'missing_h1'
  | 'weak_h1'
  | 'multiple_h1'
  | 'weak_heading_structure'
  | 'thin_service_content'
  | 'weak_location_specificity'
  | 'no_faq_content'
  | 'no_schema'
  | 'invalid_schema'
  | 'weak_internal_linking'
  | 'missing_alt_text'
  | 'not_indexable'
  | 'missing_sitemap'
  | 'missing_robots_txt'
  | 'slow_page_speed'
  | 'orphan_pages'
  | 'broken_internal_links'

export type SeoSignalSeverity = 'high' | 'medium' | 'low'

export type SeoSignalDefinition = {
  key: SeoFailingSignalKey
  label: string
  severity: SeoSignalSeverity
  pillar: 'SEO & AI Visibility'
}

export const SEO_SIGNAL_DEFINITIONS: SeoSignalDefinition[] = [
  { key: 'missing_title_tag', label: 'Missing page title', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'weak_title_tag', label: 'Page title is too generic', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'missing_meta_description', label: 'Missing meta description', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'weak_meta_description', label: 'Meta description is too generic', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'missing_h1', label: 'Missing main heading (H1)', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'weak_h1', label: 'Main heading is too generic', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'multiple_h1', label: 'Multiple H1 headings found', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'weak_heading_structure', label: 'Heading structure needs improvement', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'thin_service_content', label: 'Service content is too thin', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'weak_location_specificity', label: 'No location or city mentioned', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'no_faq_content', label: 'No FAQ or answer-style content found', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'no_schema', label: 'No structured data (schema) found', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'invalid_schema', label: 'Structured data has errors', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'weak_internal_linking', label: 'Internal linking is weak', severity: 'low', pillar: 'SEO & AI Visibility' },
  { key: 'missing_alt_text', label: 'Images missing descriptive alt text', severity: 'low', pillar: 'SEO & AI Visibility' },
  { key: 'not_indexable', label: 'Page may be blocked from search engines', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'missing_sitemap', label: 'No XML sitemap found', severity: 'medium', pillar: 'SEO & AI Visibility' },
  { key: 'missing_robots_txt', label: 'No robots.txt file found', severity: 'low', pillar: 'SEO & AI Visibility' },
  { key: 'slow_page_speed', label: 'Page speed is hurting SEO', severity: 'high', pillar: 'SEO & AI Visibility' },
  { key: 'orphan_pages', label: 'Pages with no internal links pointing to them', severity: 'low', pillar: 'SEO & AI Visibility' },
  { key: 'broken_internal_links', label: 'Broken internal links found', severity: 'medium', pillar: 'SEO & AI Visibility' },
]

export const SEO_SIGNAL_DISPLAY_NAMES: Record<SeoFailingSignalKey, string> =
  Object.fromEntries(
    SEO_SIGNAL_DEFINITIONS.map(d => [d.key, d.label])
  ) as Record<SeoFailingSignalKey, string>
