import { describe, expect, it } from 'vitest';

import { gradeSEO, gradeSEOFromScore } from '@/lib/audit/gradeSEO';

const PASSING_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Professional Plumbing Services in Dallas</title>
  <meta name="description" content="Licensed plumbers serving Dallas and surrounding areas with emergency repairs, drain cleaning, and water heater installation. Call today for a free estimate.">
  <script type="application/ld+json">
    {"@type": "LocalBusiness", "name": "Dallas Plumbing Co"}
  </script>
</head>
<body>
  <h1>Expert Plumbing in Dallas</h1>
  <h2>Our Services</h2>
  <h2>Frequently Asked Questions</h2>
  <p>We are serving Dallas homeowners with reliable plumbing repairs and installations.</p>
  <a href="/services">Services</a>
  <a href="/contact">Contact</a>
  <img src="/hero.jpg" alt="Plumber fixing a sink">
</body>
</html>`;

describe('gradeSEOFromScore', () => {
  it('maps 0 to F', () => {
    expect(gradeSEOFromScore(0)).toBe('F');
  });

  it('maps 2 to D', () => {
    expect(gradeSEOFromScore(2)).toBe('D');
  });

  it('maps 4 to C', () => {
    expect(gradeSEOFromScore(4)).toBe('C');
  });

  it('maps 6 to B', () => {
    expect(gradeSEOFromScore(6)).toBe('B');
  });

  it('maps 8 to A', () => {
    expect(gradeSEOFromScore(8)).toBe('A');
  });

  it('maps 9 to A', () => {
    expect(gradeSEOFromScore(9)).toBe('A');
  });
});

describe('gradeSEO', () => {
  it('returns score 9, grade A, and no signals when all checks pass', () => {
    const result = gradeSEO(PASSING_HTML);
    expect(result.seoScore).toBe(9);
    expect(result.seoGrade).toBe('A');
    expect(result.seoFailingSignals).toEqual([]);
  });

  it('returns missing_title_tag when title is absent', () => {
    const html = PASSING_HTML.replace(/<title>[^<]+<\/title>/i, '');
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('missing_title_tag');
    expect(result.seoScore).toBeLessThan(9);
  });

  it('returns weak_title_tag for a generic title', () => {
    const html = PASSING_HTML.replace(
      /<title>[^<]+<\/title>/i,
      '<title>Home</title>'
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('weak_title_tag');
  });

  it('returns missing_meta_description when meta description is absent', () => {
    const html = PASSING_HTML.replace(/<meta name="description"[^>]+>/i, '');
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('missing_meta_description');
  });

  it('returns weak_meta_description when description is too short', () => {
    const html = PASSING_HTML.replace(
      /content="Licensed plumbers[^"]+"/,
      'content="Short description."'
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('weak_meta_description');
  });

  it('returns missing_h1 when no h1 is present', () => {
    const html = PASSING_HTML.replace(/<h1>[^<]+<\/h1>/i, '');
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('missing_h1');
  });

  it('returns multiple_h1 when more than one h1 is present', () => {
    const html = PASSING_HTML.replace(
      '</h1>',
      '</h1><h1>Second Heading</h1>'
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('multiple_h1');
  });

  it('returns weak_heading_structure when fewer than 2 h2 elements exist', () => {
    const html = PASSING_HTML.replace(/<h2>Frequently Asked Questions<\/h2>/i, '');
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('weak_heading_structure');
  });

  it('returns weak_location_specificity when no location indicators exist', () => {
    const html = PASSING_HTML.replace(
      /We are serving Dallas homeowners[^<]+/,
      'We provide plumbing repairs and installations for local homeowners.'
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('weak_location_specificity');
  });

  it('emits thin_service_content when body is short and has no location', () => {
    const html = `<!DOCTYPE html><html><head>
      <title>Professional Plumbing Services in Dallas</title>
      <meta name="description" content="Licensed plumbers serving Dallas and surrounding areas with emergency repairs, drain cleaning, and water heater installation. Call today for a free estimate.">
      <script type="application/ld+json">{"@type": "LocalBusiness"}</script>
    </head><body>
      <h1>Expert Plumbing</h1><h2>Services</h2><h2>FAQ</h2>
      <p>Short copy only.</p>
      <a href="/services">Services</a><a href="/contact">Contact</a>
    </body></html>`;
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('weak_location_specificity');
    expect(result.seoFailingSignals).toContain('thin_service_content');
  });

  it('returns no_faq_content when FAQ content is absent', () => {
    const html = PASSING_HTML.replace(
      /<h2>Frequently Asked Questions<\/h2>/i,
      '<h2>About Us</h2>'
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('no_faq_content');
  });

  it('passes FAQ check when frequently asked appears in content', () => {
    const html = PASSING_HTML.replace(
      /<h2>Frequently Asked Questions<\/h2>/i,
      '<h2>Customer Questions</h2>'
    ).replace(
      'We are serving Dallas homeowners',
      'Frequently asked questions about our plumbing services. We are serving Dallas homeowners'
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).not.toContain('no_faq_content');
  });

  it('returns no_schema when schema markup is absent', () => {
    const html = PASSING_HTML.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/i,
      ''
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('no_schema');
  });

  it('passes schema check when LocalBusiness schema is present', () => {
    const result = gradeSEO(PASSING_HTML);
    expect(result.seoFailingSignals).not.toContain('no_schema');
  });

  it('returns weak_internal_linking when fewer than 2 internal links exist', () => {
    const html = PASSING_HTML.replace(/<a href="\/contact">Contact<\/a>/i, '');
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('weak_internal_linking');
  });

  it('passes image alt check when all images have alt text', () => {
    const result = gradeSEO(PASSING_HTML);
    expect(result.seoFailingSignals).not.toContain('missing_alt_text');
  });

  it('returns missing_alt_text when at least one image lacks alt text', () => {
    const html = PASSING_HTML.replace(
      'alt="Plumber fixing a sink"',
      ''
    );
    const result = gradeSEO(html);
    expect(result.seoFailingSignals).toContain('missing_alt_text');
  });

  it('returns the correct result shape', () => {
    const result = gradeSEO(PASSING_HTML);
    expect(result).toEqual(
      expect.objectContaining({
        seoGrade: expect.any(String),
        seoScore: expect.any(Number),
        seoFailingSignals: expect.any(Array),
      })
    );
  });
});
