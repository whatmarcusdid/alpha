export type SpeedTopIssueKey =
  | 'render_blocking_resources'
  | 'unused_css_js'
  | 'oversized_images'
  | 'missing_compression'
  | 'no_cache_headers'
  | 'slow_server_response'
  | 'heavy_third_party_scripts'
  | 'unminified_css_js';

const PSI_AUDIT_MAP: Record<string, SpeedTopIssueKey> = {
  'render-blocking-resources': 'render_blocking_resources',
  'unused-css-rules': 'unused_css_js',
  'unused-javascript': 'unused_css_js',
  'uses-optimized-images': 'oversized_images',
  'uses-responsive-images': 'oversized_images',
  'uses-webp-images': 'oversized_images',
  'uses-text-compression': 'missing_compression',
  'uses-long-cache-ttl': 'no_cache_headers',
  'server-response-time': 'slow_server_response',
  'third-party-summary': 'heavy_third_party_scripts',
  'unminified-css': 'unminified_css_js',
  'unminified-javascript': 'unminified_css_js',
};

export const SPEED_ISSUE_DISPLAY_NAMES: Record<SpeedTopIssueKey, string> = {
  render_blocking_resources:
    'Render-blocking scripts are slowing page load',
  unused_css_js: 'Unused CSS and JavaScript is adding load time',
  oversized_images: 'Images are too large and unoptimized',
  missing_compression: 'Text compression is not enabled',
  no_cache_headers: 'Browser caching is not configured',
  slow_server_response: 'Server response time is too slow',
  heavy_third_party_scripts:
    'Heavy third-party scripts are blocking the page',
  unminified_css_js: 'CSS and JavaScript files are not minified',
};

const PRIORITY_ORDER: SpeedTopIssueKey[] = [
  'render_blocking_resources',
  'oversized_images',
  'unused_css_js',
  'unminified_css_js',
  'missing_compression',
  'no_cache_headers',
  'heavy_third_party_scripts',
  'slow_server_response',
];

export function extractSpeedTopIssues(
  psiAudits:
    | Record<string, { score: number | null; displayValue?: string }>
    | undefined
    | null
): SpeedTopIssueKey[] {
  if (!psiAudits) return [];

  const failing = new Set<SpeedTopIssueKey>();

  for (const [auditId, canonicalKey] of Object.entries(PSI_AUDIT_MAP)) {
    const audit = psiAudits[auditId];
    if (!audit) continue;
    if (audit.score === null || audit.score < 0.5) {
      failing.add(canonicalKey);
    }
  }

  return PRIORITY_ORDER.filter((key) => failing.has(key)).slice(0, 4);
}
