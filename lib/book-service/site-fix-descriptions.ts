import type { SiteFixSKU } from '@/lib/book-service/skus';

export const SITE_FIX_DESCRIPTIONS: Record<SiteFixSKU, string> = {
  speed_fix:
    'We resolve every speed issue found in your audit — slow load times, render-blocking resources, and Core Web Vitals failures. Done within 48 hours.',
  security_fix:
    'We harden your site against the security issues flagged in your audit — SSL, plugin vulnerabilities, and exposure risks. Done within 48 hours.',
  seo_ai_visibility_fix:
    'We fix the SEO and AI visibility gaps from your audit — structured data, meta signals, and crawlability. Done within 48 hours.',
  full_bundle:
    'We tackle every issue across speed, security, and SEO & AI visibility found in your audit. All three fixes delivered within 48 hours.',
};
