import type { FixJobEntitlements } from '@/lib/types/fix-job';

export type QAItemDefinition = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  section: 'security' | 'speed' | 'seo';
};

export const QA_ITEMS: QAItemDefinition[] = [
  {
    id: 'sec_qa_1',
    section: 'security',
    title: 'SSL certificate valid + HTTPS enforced',
    description:
      'Visit the site on HTTP — confirm it redirects to HTTPS. Check cert validity in the browser padlock.',
    tags: ['Security', 'Manual check'],
  },
  {
    id: 'sec_qa_2',
    section: 'security',
    title: 'Zero mixed content errors',
    description:
      'Open DevTools → Console. No mixed content warnings should appear on homepage or service pages.',
    tags: ['Security', 'DevTools'],
  },
  {
    id: 'sec_qa_3',
    section: 'security',
    title: 'Sucuri SiteCheck returns clean',
    description:
      'Run a fresh Sucuri SiteCheck scan. No malware, no blacklist flags, no security warnings.',
    tags: ['Security', 'Sucuri SiteCheck'],
  },
  {
    id: 'sec_qa_4',
    section: 'security',
    title: 'Security headers grade A',
    description:
      'Run the domain through securityheaders.com. HSTS, X-Frame, X-Content-Type, Referrer, and Permissions-Policy all present.',
    tags: ['Security', 'securityheaders.com'],
  },
  {
    id: 'sec_qa_5',
    section: 'security',
    title: 'WAF active + login protection enabled',
    description:
      'Confirm Wordfence is active, firewall enabled, and login protection (attempt limiting) is on.',
    tags: ['Security', 'Wordfence dashboard'],
  },
  {
    id: 'spd_qa_1',
    section: 'speed',
    title: 'PSI mobile score improved vs. baseline',
    description:
      'Re-run PageSpeed Insights. Score must be higher than the baseline of 34.',
    tags: ['Speed', 'PageSpeed Insights'],
  },
  {
    id: 'spd_qa_2',
    section: 'speed',
    title: 'LCP under 2.5s on mobile',
    description:
      "Google's 'Good' LCP threshold is under 2.5s. Confirm homepage and top service page both pass.",
    tags: ['Speed', 'PageSpeed Insights'],
  },
  {
    id: 'spd_qa_3',
    section: 'speed',
    title: 'Site loads correctly on mobile + desktop',
    description:
      'Test in Chrome DevTools mobile emulation at 375px. No broken layout, missing images, or font issues.',
    tags: ['Speed', 'DevTools'],
  },
  {
    id: 'spd_qa_4',
    section: 'speed',
    title: 'Forms still submit correctly',
    description:
      'Submit a test entry on the contact or booking form. Confirm it reaches the inbox and no JS errors appear in console.',
    tags: ['Speed', 'Manual test'],
  },
  {
    id: 'spd_qa_5',
    section: 'speed',
    title: 'Google Analytics still firing',
    description:
      'Open DevTools → Network tab. Filter for "google-analytics" or "gtag". Confirm requests fire on page load.',
    tags: ['Speed', 'DevTools Network'],
  },
  {
    id: 'seo_qa_1',
    section: 'seo',
    title: 'Title tag + meta description on all key pages',
    description:
      'Check homepage and top service page in browser tab and View Source. Title under 60 chars, meta under 160.',
    tags: ['SEO', 'View Source / Yoast'],
  },
  {
    id: 'seo_qa_2',
    section: 'seo',
    title: 'One H1 per page — service + location aligned',
    description:
      'Confirm exactly one H1 on homepage and service page. No generic text like "Welcome" or "Home."',
    tags: ['SEO', 'DevTools'],
  },
  {
    id: 'seo_qa_3',
    section: 'seo',
    title: 'Schema validates in Google Rich Results Test',
    description:
      'Run the homepage URL through Rich Results Test. LocalBusiness and FAQPage schema must return zero errors.',
    tags: ['SEO', 'Rich Results Test'],
  },
  {
    id: 'seo_qa_4',
    section: 'seo',
    title: 'FAQ section visible on homepage or service page',
    description:
      'Scroll the page and confirm 3–5 FAQ items are visible with question headings and concise answers below each.',
    tags: ['SEO', 'Visual check'],
  },
];

export function getQAItemsForEntitlements(
  entitlements: FixJobEntitlements
): QAItemDefinition[] {
  return QA_ITEMS.filter((item) => {
    if (item.section === 'security') return entitlements.security;
    if (item.section === 'speed') return entitlements.speed;
    return entitlements.seo;
  });
}

export const QA_SECTION_LABELS: Record<'security' | 'speed' | 'seo', string> = {
  security: 'Security QA',
  speed: 'Speed QA',
  seo: 'SEO & AI Visibility QA',
};
