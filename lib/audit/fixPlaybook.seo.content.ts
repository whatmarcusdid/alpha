// fixPlaybook.seo.content.ts — FINISHED CONTENT HANDOFF — SEO & AI Visibility (21 signals)
// Authored by Marcus + Claude from SOP Phase 3 §1–§6.
//
// RULES FOR CURSOR:
// - Transcribe verbatim into FIX_PLAYBOOK. Do NOT author/alter steps.
// - Severity per MVP-01 frozen rules. not_indexable → moderate (frozen, do not change).
// - `tools` on steps MAY name tools. `clientSummaryTemplate` must NOT contain denylisted
//   tool names (WP Rocket, Perfmatters, ShortPixel, Sucuri, MalCare, Yoast, Rank Math,
//   AIOSEO, Asset CleanUp, GTmetrix, Query Monitor).

// ── SEO & AI VISIBILITY (21 signals) — SOP Phase 3. Pillar total ≈ 112 min. ────────────
export const SEO_CONTENT = {
  // Section 1 — Indexability
  not_indexable: {
    // severity: moderate (frozen — do not change even if content comment says high)
    sopReference: "SOP Phase 3 §1 — Audit on-page SEO & AI-readiness",
    estimatedMinutes: 7,
    steps: [
      { id: "not_indexable_1", instruction: "Check the page's robots meta tag, X-Robots-Tag header, and robots.txt for noindex/disallow rules blocking key pages.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
      { id: "not_indexable_2", instruction: "Remove the noindex directive or disallow rule blocking the homepage and key service pages.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "not_indexable_3", instruction: "Confirm 'Discourage search engines from indexing this site' is unchecked in WordPress Reading settings.", accessNeeded: "wp_admin" },
      { id: "not_indexable_4", instruction: "Run URL Inspection in Google Search Console and request indexing to validate the fix.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
    ],
    verification: "Google Search Console URL Inspection reports key pages as indexable/allowed with no noindex or robots disallow remaining.",
    clientSummaryTemplate: "We removed the setting that was hiding your key pages from Google so they can be found and ranked.",
  },
  missing_sitemap: {
    // severity: moderate
    sopReference: "SOP Phase 3 §1 — Audit on-page SEO & AI-readiness",
    estimatedMinutes: 5,
    steps: [
      { id: "missing_sitemap_1", instruction: "Confirm no XML sitemap exists at /sitemap.xml or /sitemap_index.xml.", accessNeeded: "external_tool" },
      { id: "missing_sitemap_2", instruction: "Enable XML sitemap generation in the site's SEO plugin.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "missing_sitemap_3", instruction: "Ensure key service and location pages are included and thin/utility pages are excluded.", accessNeeded: "wp_admin" },
      { id: "missing_sitemap_4", instruction: "Submit the sitemap URL in Google Search Console.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
    ],
    verification: "A valid XML sitemap loads at the expected URL, lists key pages, and is submitted/accepted in Google Search Console.",
    clientSummaryTemplate: "We created and submitted a sitemap so search engines can find all your important pages.",
  },
  missing_robots_txt: {
    // severity: moderate
    sopReference: "SOP Phase 3 §1 — Audit on-page SEO & AI-readiness",
    estimatedMinutes: 4,
    steps: [
      { id: "missing_robots_txt_1", instruction: "Confirm no robots.txt is served at the domain root.", accessNeeded: "external_tool" },
      { id: "missing_robots_txt_2", instruction: "Add a robots.txt that allows crawling of public content and references the XML sitemap.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "missing_robots_txt_3", instruction: "Ensure it does not accidentally block key pages or assets.", accessNeeded: "wp_admin" },
      { id: "missing_robots_txt_4", instruction: "Validate with the Google Search Console robots.txt tester.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
    ],
    verification: "robots.txt loads at the root, references the sitemap, blocks nothing critical, and passes the Search Console robots tester.",
    clientSummaryTemplate: "We added a proper robots file so search engines know which pages to crawl and where to find your sitemap.",
  },
  slow_page_speed: {
    // severity: moderate — cross-reference to Speed pillar; do NOT duplicate speed fixes here
    sopReference: "SOP Phase 3 §1 — cross-reference to Phase 2 (Speed pillar)",
    estimatedMinutes: 3,
    steps: [
      { id: "slow_page_speed_1", instruction: "Confirm this SEO speed signal traces to the same PageSpeed issues handled by the Speed pillar (oversized_images, render_blocking_resources, etc.).", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
      { id: "slow_page_speed_2", instruction: "Do NOT re-implement speed fixes here — ensure the Speed-pillar signals are addressed in SOP Phase 2 instead.", accessNeeded: "none" },
      { id: "slow_page_speed_3", instruction: "After Phase 2 work, re-run PageSpeed and confirm this SEO page-speed signal clears.", accessNeeded: "external_tool", tools: ["PageSpeed Insights"] },
    ],
    verification: "After Phase 2 speed fixes complete, PageSpeed scores improve and this SEO page-speed signal no longer flags — with no duplicate speed work performed in the SEO pillar.",
    clientSummaryTemplate: "We made sure the speed improvements to your site also lift how search engines judge it.",
  },

  // Section 2 — Title tags and meta descriptions
  missing_title_tag: {
    // severity: high
    sopReference: "SOP Phase 3 §2 — Title tags and meta descriptions",
    estimatedMinutes: 6,
    steps: [
      { id: "missing_title_tag_1", instruction: "Identify key pages missing a title tag (homepage, top service pages).", accessNeeded: "external_tool" },
      { id: "missing_title_tag_2", instruction: "Write a unique title for each naming the service, primary location, and a clear benefit, within ~60 characters.", accessNeeded: "wp_admin" },
      { id: "missing_title_tag_3", instruction: "Set the title via the SEO plugin's title field for each page.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "missing_title_tag_4", instruction: "Confirm the rendered <title> updates in the page source / SERP preview.", accessNeeded: "external_tool" },
    ],
    verification: "Each key page renders a unique, descriptive <title> naming service + location within ~60 characters, reflected in the SEO plugin SERP preview.",
    clientSummaryTemplate: "We added clear page titles that tell Google and customers exactly what you do and where.",
  },
  weak_title_tag: {
    // severity: moderate
    sopReference: "SOP Phase 3 §2 — Title tags and meta descriptions",
    estimatedMinutes: 5,
    steps: [
      { id: "weak_title_tag_1", instruction: "Review generic or duplicated titles on key pages.", accessNeeded: "external_tool" },
      { id: "weak_title_tag_2", instruction: "Rewrite each to lead with the specific service + location and a differentiator, avoiding duplication across pages.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "weak_title_tag_3", instruction: "Keep within ~60 characters and confirm uniqueness across key pages.", accessNeeded: "wp_admin" },
      { id: "weak_title_tag_4", instruction: "Verify updated titles in the page source / SERP preview.", accessNeeded: "external_tool" },
    ],
    verification: "Key-page titles are unique, specific to service + location, within ~60 characters, and no longer generic or duplicated.",
    clientSummaryTemplate: "We rewrote your page titles to be specific and compelling instead of generic.",
  },
  missing_meta_description: {
    // severity: high
    sopReference: "SOP Phase 3 §2 — Title tags and meta descriptions",
    estimatedMinutes: 6,
    steps: [
      { id: "missing_meta_description_1", instruction: "Identify key pages with no meta description.", accessNeeded: "external_tool" },
      { id: "missing_meta_description_2", instruction: "Write a unique 140–160 character description per page mentioning service, location, and a call to action.", accessNeeded: "wp_admin" },
      { id: "missing_meta_description_3", instruction: "Add each via the SEO plugin's meta description field.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "missing_meta_description_4", instruction: "Confirm the description renders in the page source / SERP preview.", accessNeeded: "external_tool" },
    ],
    verification: "Each key page has a unique 140–160 character meta description with service/location and a CTA, visible in the SERP preview.",
    clientSummaryTemplate: "We added search-result descriptions that give people a clear reason to click through to your site.",
  },
  weak_meta_description: {
    // severity: moderate
    sopReference: "SOP Phase 3 §2 — Title tags and meta descriptions",
    estimatedMinutes: 4,
    steps: [
      { id: "weak_meta_description_1", instruction: "Review thin or duplicated meta descriptions.", accessNeeded: "external_tool" },
      { id: "weak_meta_description_2", instruction: "Rewrite each to be page-specific with service, location, and a clear benefit/CTA, 140–160 characters.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "weak_meta_description_3", instruction: "Ensure no duplication across key pages.", accessNeeded: "wp_admin" },
      { id: "weak_meta_description_4", instruction: "Verify in the SERP preview.", accessNeeded: "external_tool" },
    ],
    verification: "Meta descriptions are unique, specific, 140–160 characters, and include a benefit/CTA on key pages.",
    clientSummaryTemplate: "We sharpened your search-result descriptions so they better sell the click.",
  },

  // Section 3 — H1 and heading structure
  missing_h1: {
    // severity: high
    sopReference: "SOP Phase 3 §2 — Headings",
    estimatedMinutes: 5,
    steps: [
      { id: "missing_h1_1", instruction: "Identify key pages lacking an H1.", accessNeeded: "external_tool" },
      { id: "missing_h1_2", instruction: "Add one clear H1 per page summarizing the service + primary location.", accessNeeded: "wp_admin" },
      { id: "missing_h1_3", instruction: "Ensure the H1 is a true heading element, not styled text.", accessNeeded: "wp_admin" },
      { id: "missing_h1_4", instruction: "Confirm exactly one H1 renders per page in the source.", accessNeeded: "external_tool" },
    ],
    verification: "Each key page has exactly one descriptive H1 naming service + location, implemented as a real <h1> element.",
    clientSummaryTemplate: "We added a clear main headline to each page so visitors and search engines instantly understand it.",
  },
  weak_h1: {
    // severity: moderate
    sopReference: "SOP Phase 3 §2 — Headings",
    estimatedMinutes: 5,
    steps: [
      { id: "weak_h1_1", instruction: "Review generic H1s (e.g., 'Home', 'Welcome') on key pages.", accessNeeded: "external_tool" },
      { id: "weak_h1_2", instruction: "Rewrite each H1 to state the specific service + primary location.", accessNeeded: "wp_admin" },
      { id: "weak_h1_3", instruction: "Keep it distinct from the title tag while consistent in intent.", accessNeeded: "wp_admin" },
      { id: "weak_h1_4", instruction: "Confirm the updated H1 renders.", accessNeeded: "external_tool" },
    ],
    verification: "Key-page H1s are specific to service + location and no longer generic; one H1 per page.",
    clientSummaryTemplate: "We rewrote vague page headlines to clearly state your service and area.",
  },
  multiple_h1: {
    // severity: moderate
    sopReference: "SOP Phase 3 §2 — Headings",
    estimatedMinutes: 5,
    steps: [
      { id: "multiple_h1_1", instruction: "Identify pages rendering more than one H1.", accessNeeded: "external_tool" },
      { id: "multiple_h1_2", instruction: "Keep the single most relevant H1 and demote the others to H2/H3 per a logical hierarchy.", accessNeeded: "wp_admin" },
      { id: "multiple_h1_3", instruction: "Check theme/builder templates that may inject extra H1s.", accessNeeded: "wp_admin" },
      { id: "multiple_h1_4", instruction: "Confirm exactly one H1 per key page.", accessNeeded: "external_tool" },
    ],
    verification: "Each key page renders exactly one H1, with extra headings demoted into a logical H2/H3 structure.",
    clientSummaryTemplate: "We fixed pages that had several competing main headings so each page has one clear focus.",
  },
  weak_heading_structure: {
    // severity: moderate
    sopReference: "SOP Phase 3 §2 — Headings",
    estimatedMinutes: 5,
    steps: [
      { id: "weak_heading_structure_1", instruction: "Review heading hierarchy (H1→H2→H3) on key pages for skipped levels or illogical order.", accessNeeded: "external_tool" },
      { id: "weak_heading_structure_2", instruction: "Restructure headings into a logical outline (services, process, reviews, FAQs).", accessNeeded: "wp_admin" },
      { id: "weak_heading_structure_3", instruction: "Convert styled/bold text used as headings into real heading elements.", accessNeeded: "wp_admin" },
      { id: "weak_heading_structure_4", instruction: "Confirm a clean, sequential hierarchy in the page source.", accessNeeded: "external_tool" },
    ],
    verification: "Key pages follow a logical, sequential heading hierarchy (no skipped levels) with section headings as real H2/H3 elements.",
    clientSummaryTemplate: "We organized each page's headings into a clear structure that's easier for people and search to follow.",
  },

  // Section 4 — Service, location, and FAQ content
  thin_service_content: {
    // severity: moderate
    sopReference: "SOP Phase 3 §3 — Service + location specificity",
    estimatedMinutes: 7,
    steps: [
      { id: "thin_service_content_1", instruction: "Identify service pages with thin copy that doesn't clearly explain the offering.", accessNeeded: "external_tool" },
      { id: "thin_service_content_2", instruction: "Expand each page to clearly state what the service is, who it's for, and what's included.", accessNeeded: "wp_admin" },
      { id: "thin_service_content_3", instruction: "Add specifics (process, scope, differentiators) so the page is genuinely useful, not padded.", accessNeeded: "wp_admin" },
      { id: "thin_service_content_4", instruction: "Review for readability and natural service language.", accessNeeded: "wp_admin" },
    ],
    verification: "Key service pages clearly describe the service, audience, and inclusions with substantive, readable copy — no longer flagged as thin.",
    clientSummaryTemplate: "We expanded your service pages so they fully explain what you offer and who it's for.",
  },
  weak_location_specificity: {
    // severity: moderate
    sopReference: "SOP Phase 3 §3 — Service + location specificity",
    estimatedMinutes: 7,
    steps: [
      { id: "weak_location_specificity_1", instruction: "Check the homepage and service pages for missing city/service-area language.", accessNeeded: "external_tool" },
      { id: "weak_location_specificity_2", instruction: "Add the primary city/area and who it's for (homeowners, property managers, etc.) into headings and body copy naturally.", accessNeeded: "wp_admin" },
      { id: "weak_location_specificity_3", instruction: "Add or update the service-area section and ensure NAP (name, address, phone) consistency.", accessNeeded: "wp_admin" },
      { id: "weak_location_specificity_4", instruction: "Confirm location language appears on key pages.", accessNeeded: "none" },
    ],
    verification: "Homepage and service pages clearly state the primary city/service area and audience, with present and consistent NAP details.",
    clientSummaryTemplate: "We made your service area and location clear on the site so local customers and search know exactly where you work.",
  },
  no_faq_content: {
    // severity: moderate
    sopReference: "SOP Phase 3 §4 — FAQ / answer-style content",
    estimatedMinutes: 7,
    steps: [
      { id: "no_faq_content_1", instruction: "Identify the homepage or a top service page lacking answer-style content.", accessNeeded: "external_tool" },
      { id: "no_faq_content_2", instruction: "Add a short FAQ of 3–5 common questions with concise 1–3 sentence answers.", accessNeeded: "wp_admin" },
      { id: "no_faq_content_3", instruction: "Format each question as a heading with its answer immediately after so search/AI can parse it.", accessNeeded: "wp_admin" },
      { id: "no_faq_content_4", instruction: "Review answers for accuracy and plain language.", accessNeeded: "wp_admin" },
    ],
    verification: "A 3–5 question FAQ exists on the homepage or a key service page, each question a heading with a concise answer, parseable by search/AI.",
    clientSummaryTemplate: "We added a clear FAQ section answering common customer questions, which also helps AI tools understand your business.",
  },

  // Section 5 — Structured data
  no_schema: {
    // severity: moderate
    sopReference: "SOP Phase 3 §5 — Structured data (schema)",
    estimatedMinutes: 8,
    steps: [
      { id: "no_schema_1", instruction: "Confirm no LocalBusiness/Service/FAQ schema is present.", accessNeeded: "external_tool", tools: ["Google Rich Results Test"] },
      { id: "no_schema_2", instruction: "Add LocalBusiness and/or Service schema via the SEO plugin or a code block.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "no_schema_3", instruction: "Add FAQ schema for any FAQ section.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "no_schema_4", instruction: "Validate with Google's Rich Results Test.", accessNeeded: "external_tool", tools: ["Google Rich Results Test"] },
    ],
    verification: "LocalBusiness/Service (and FAQ where applicable) schema is present and validates without errors in Google's Rich Results Test.",
    clientSummaryTemplate: "We added structured data so Google and AI tools can clearly read your business details and services.",
  },
  invalid_schema: {
    // severity: moderate
    sopReference: "SOP Phase 3 §5 — Structured data (schema)",
    estimatedMinutes: 5,
    steps: [
      { id: "invalid_schema_1", instruction: "Run the page through Google's Rich Results Test to list schema errors/warnings.", accessNeeded: "external_tool", tools: ["Google Rich Results Test"] },
      { id: "invalid_schema_2", instruction: "Fix invalid or missing required properties in the schema markup.", accessNeeded: "wp_admin", tools: ["SEO plugin"] },
      { id: "invalid_schema_3", instruction: "Remove duplicate or conflicting schema blocks.", accessNeeded: "wp_admin" },
      { id: "invalid_schema_4", instruction: "Re-validate until the Rich Results Test passes cleanly.", accessNeeded: "external_tool", tools: ["Google Rich Results Test"] },
    ],
    verification: "Google's Rich Results Test passes with no errors; required properties present and no duplicate/conflicting schema.",
    clientSummaryTemplate: "We fixed the errors in your site's structured data so search engines can use it correctly.",
  },

  // Section 6 — Internal links and alt text
  weak_internal_linking: {
    // severity: moderate
    sopReference: "SOP Phase 3 §6 — Internal links and alt text",
    estimatedMinutes: 5,
    steps: [
      { id: "weak_internal_linking_1", instruction: "Map current internal links between the homepage, service pages, and contact/booking.", accessNeeded: "external_tool" },
      { id: "weak_internal_linking_2", instruction: "Add contextual internal links from the homepage and key pages to main service and booking pages.", accessNeeded: "wp_admin" },
      { id: "weak_internal_linking_3", instruction: "Use descriptive anchor text (service + location) rather than 'click here'.", accessNeeded: "wp_admin" },
      { id: "weak_internal_linking_4", instruction: "Confirm key pages are reachable within a couple of clicks.", accessNeeded: "none" },
    ],
    verification: "Homepage and key pages link internally to main service and contact/booking pages using descriptive anchor text; key pages are within ~2 clicks.",
    clientSummaryTemplate: "We connected your pages with helpful internal links so visitors and search can navigate to your key services.",
  },
  missing_alt_text: {
    // severity: moderate
    sopReference: "SOP Phase 3 §6 — Internal links and alt text",
    estimatedMinutes: 5,
    steps: [
      { id: "missing_alt_text_1", instruction: "Identify hero and key-section images missing alt text.", accessNeeded: "external_tool" },
      { id: "missing_alt_text_2", instruction: "Add descriptive alt text describing subject + service/context (e.g., 'Technician repairing AC unit in Denver home').", accessNeeded: "wp_admin" },
      { id: "missing_alt_text_3", instruction: "Leave purely decorative images with empty alt.", accessNeeded: "wp_admin" },
      { id: "missing_alt_text_4", instruction: "Confirm key images have meaningful alt text in the source.", accessNeeded: "external_tool" },
    ],
    verification: "Hero and key-section images have descriptive, context-appropriate alt text; decorative images use empty alt.",
    clientSummaryTemplate: "We described your key images with alt text so they're accessible and understood by search engines.",
  },
  orphan_pages: {
    // severity: moderate
    sopReference: "SOP Phase 3 §6 — Internal links and alt text",
    estimatedMinutes: 4,
    steps: [
      { id: "orphan_pages_1", instruction: "Identify pages with no internal links pointing to them.", accessNeeded: "external_tool", tools: ["Google Search Console"] },
      { id: "orphan_pages_2", instruction: "Add internal links to each orphaned key page from relevant pages/navigation.", accessNeeded: "wp_admin" },
      { id: "orphan_pages_3", instruction: "Add important orphaned pages to the menu or sitemap where appropriate.", accessNeeded: "wp_admin" },
      { id: "orphan_pages_4", instruction: "Confirm each formerly orphaned page has at least one internal link.", accessNeeded: "external_tool" },
    ],
    verification: "No key page is orphaned; each has at least one contextual internal link and appears in navigation/sitemap where appropriate.",
    clientSummaryTemplate: "We linked up pages that were previously disconnected so they can be found and ranked.",
  },
  broken_internal_links: {
    // severity: moderate
    sopReference: "SOP Phase 3 §6 — Internal links and alt text",
    estimatedMinutes: 4,
    steps: [
      { id: "broken_internal_links_1", instruction: "Crawl the site to list broken internal links (404s).", accessNeeded: "external_tool" },
      { id: "broken_internal_links_2", instruction: "Fix each by updating the URL or redirecting to the correct page.", accessNeeded: "wp_admin" },
      { id: "broken_internal_links_3", instruction: "Remove links to permanently deleted pages.", accessNeeded: "wp_admin" },
      { id: "broken_internal_links_4", instruction: "Re-crawl to confirm zero broken internal links.", accessNeeded: "external_tool" },
    ],
    verification: "A re-crawl reports zero broken internal links; previously broken links now resolve or redirect correctly.",
    clientSummaryTemplate: "We fixed the broken links on your site so visitors and search never hit dead ends.",
  },
};
