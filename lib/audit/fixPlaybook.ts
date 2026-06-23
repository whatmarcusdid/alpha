import { SeoFailingSignalKey } from '@/lib/types/seoSignals'

export type FixPlaybookEntry = {
  key: SeoFailingSignalKey
  title: string
  description: string
  whyItMatters: string
  steps: string[]
}

function stubEntry(key: SeoFailingSignalKey): FixPlaybookEntry {
  return {
    key,
    title: key,
    description: 'Placeholder — to be filled in during Admin Dashboard epic.',
    whyItMatters: 'Placeholder',
    steps: ['Placeholder step'],
  }
}

export const FIX_PLAYBOOK: Record<SeoFailingSignalKey, FixPlaybookEntry> = {
  missing_title_tag: stubEntry('missing_title_tag'),
  weak_title_tag: stubEntry('weak_title_tag'),
  missing_meta_description: stubEntry('missing_meta_description'),
  weak_meta_description: stubEntry('weak_meta_description'),
  missing_h1: stubEntry('missing_h1'),
  weak_h1: stubEntry('weak_h1'),
  multiple_h1: stubEntry('multiple_h1'),
  weak_heading_structure: stubEntry('weak_heading_structure'),
  thin_service_content: stubEntry('thin_service_content'),
  weak_location_specificity: stubEntry('weak_location_specificity'),
  no_faq_content: stubEntry('no_faq_content'),
  no_schema: stubEntry('no_schema'),
  invalid_schema: stubEntry('invalid_schema'),
  weak_internal_linking: stubEntry('weak_internal_linking'),
  missing_alt_text: stubEntry('missing_alt_text'),
  not_indexable: stubEntry('not_indexable'),
  missing_sitemap: stubEntry('missing_sitemap'),
  missing_robots_txt: stubEntry('missing_robots_txt'),
  slow_page_speed: stubEntry('slow_page_speed'),
  orphan_pages: stubEntry('orphan_pages'),
  broken_internal_links: stubEntry('broken_internal_links'),
}
