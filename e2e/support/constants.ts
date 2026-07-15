// Literal copies of app constants — deliberately no `@/` imports here so
// Playwright's Node-side spec files don't need path-alias resolution config.

export const AUDIT_LEAD_ID_STORAGE_KEY = 'book-service:auditLeadId';

export const SKU_DISPLAY_NAMES = {
  seo_ai_visibility_fix: 'SEO & AI Visibility Fix',
  speed_fix: 'Speed Fix',
  security_fix: 'Security Fix',
  full_bundle: 'Full Bundle',
} as const;
