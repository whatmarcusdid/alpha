import type { Grade } from '@/lib/types/audit';
import type { SeoFailingSignalKey } from '@/lib/types/seoSignals';

export type GradeSEOResult = {
  seoGrade: Grade;
  seoScore: number;
  seoFailingSignals: SeoFailingSignalKey[];
};

export function gradeSEOFromScore(score: number): Grade {
  if (score >= 8) return 'A';
  if (score >= 6) return 'B';
  if (score >= 4) return 'C';
  if (score >= 2) return 'D';
  return 'F';
}

export function gradeSEO(html: string): GradeSEOResult {
  const signals: SeoFailingSignalKey[] = [];
  let passing = 0;

  const GENERIC_TITLES = ['home', 'welcome', 'untitled', 'page', 'website'];
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!titleMatch) {
    signals.push('missing_title_tag');
  } else {
    const title = titleMatch[1].trim();
    if (title.length < 10 || GENERIC_TITLES.includes(title.toLowerCase())) {
      signals.push('weak_title_tag');
    } else {
      passing++;
    }
  }

  const metaDescMatch =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
    );
  if (!metaDescMatch) {
    signals.push('missing_meta_description');
  } else {
    const desc = metaDescMatch[1].trim();
    if (desc.length < 50) {
      signals.push('weak_meta_description');
    } else {
      passing++;
    }
  }

  const h1Matches = [...html.matchAll(/<h1[^>]*>/gi)];
  if (h1Matches.length === 0) {
    signals.push('missing_h1');
  } else if (h1Matches.length > 1) {
    signals.push('multiple_h1');
  } else {
    passing++;
  }

  const h2Matches = [...html.matchAll(/<h2[^>]*>/gi)];
  if (h2Matches.length < 2) {
    signals.push('weak_heading_structure');
  } else {
    passing++;
  }

  const bodyText = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  const locationPatterns = [
    /\bserving\s+\w+/,
    /\blocated\s+in\s+\w+/,
    /\bnear\s+\w+/,
    /\b[A-Z]{2}\s+\d{5}\b/,
    /\b\d{5}\b/,
  ];
  const hasLocation = locationPatterns.some((p) => p.test(bodyText));
  if (!hasLocation) {
    signals.push('weak_location_specificity');
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 200) signals.push('thin_service_content');
  } else {
    passing++;
  }

  const hasFaq =
    /faq|frequently asked/i.test(html) ||
    /<h[2-4][^>]*>[^<]*\?[^<]*<\/h[2-4]>/i.test(html);
  if (!hasFaq) {
    signals.push('no_faq_content');
  } else {
    passing++;
  }

  const hasSchema =
    /"@type"\s*:\s*"(LocalBusiness|Service|FAQPage|Organization)"/i.test(html);
  if (!hasSchema) {
    signals.push('no_schema');
  } else {
    passing++;
  }

  const internalLinks = [...html.matchAll(/href=["']\/[^"']+["']/gi)];
  if (internalLinks.length < 2) {
    signals.push('weak_internal_linking');
  } else {
    passing++;
  }

  const imgTags = [...html.matchAll(/<img[^>]+>/gi)];
  const imgsWithoutAlt = imgTags.filter(
    (m) => !/alt=["'][^"']+["']/.test(m[0])
  );
  if (imgTags.length > 0 && imgsWithoutAlt.length > 0) {
    signals.push('missing_alt_text');
  } else {
    passing++;
  }

  return {
    seoGrade: gradeSEOFromScore(passing),
    seoScore: passing,
    seoFailingSignals: signals,
  };
}
