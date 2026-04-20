import type { SpeedGradeInput } from '@/lib/grading';

export type PageSpeedResult =
  | { success: true; data: SpeedGradeInput }
  | { success: false; error: string };

const PROVIDER = 'PageSpeed Insights';

function logFailure(statusCode: number | string): void {
  console.warn(PROVIDER, statusCode);
}

/**
 * SSRF guard: inspect hostname string only (no DNS). Blocks localhost, common
 * private ranges, loopback, and IPv6 link-local as literals.
 */
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (h === 'localhost') {
    return true;
  }

  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4Match) {
    const octets = [
      Number(ipv4Match[1]),
      Number(ipv4Match[2]),
      Number(ipv4Match[3]),
      Number(ipv4Match[4]),
    ];
    if (octets.some((n) => n > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 127) {
      return true;
    }
    if (a === 10) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    return false;
  }

  if (h.includes(':')) {
    if (h === '::1') {
      return true;
    }
    if (h.startsWith('fe80:')) {
      return true;
    }
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumeric(audit: unknown): number | undefined {
  if (!isRecord(audit)) {
    return undefined;
  }
  const raw = audit.numericValue;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

function extractSpeedGradeInput(payload: unknown):
  | { ok: true; value: SpeedGradeInput }
  | { ok: false } {
  if (!isRecord(payload)) {
    return { ok: false };
  }
  const lh = payload.lighthouseResult;
  if (!isRecord(lh)) {
    return { ok: false };
  }

  const categories = lh.categories;
  if (!isRecord(categories)) {
    return { ok: false };
  }
  const performance = categories.performance;
  if (!isRecord(performance)) {
    return { ok: false };
  }
  const scoreRaw = performance.score;
  if (typeof scoreRaw !== 'number' || !Number.isFinite(scoreRaw)) {
    return { ok: false };
  }

  const audits = lh.audits;
  if (!isRecord(audits)) {
    return { ok: false };
  }

  const lcpAudit = audits['largest-contentful-paint'];
  const tbtAudit = audits['total-blocking-time'];
  const clsAudit = audits['cumulative-layout-shift'];

  const lcpMs = readNumeric(lcpAudit);
  const tbtMs = readNumeric(tbtAudit);
  const clsRaw = readNumeric(clsAudit);

  if (lcpMs === undefined || tbtMs === undefined || clsRaw === undefined) {
    return { ok: false };
  }

  const performanceScore = Math.round(scoreRaw * 100);
  const lcpSeconds = lcpMs / 1000;
  const lcp = Math.round(lcpSeconds * 100) / 100;
  const tbt = Math.round(tbtMs);
  const cls = Math.round(clsRaw * 1000) / 1000;

  return {
    ok: true,
    value: {
      performanceScore,
      lcp,
      tbt,
      cls,
    },
  };
}

const SAFE_GENERIC = 'Unable to analyze site performance';
const SAFE_PARSE = 'Unable to parse performance results';

export async function fetchPageSpeed(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_PAGE_SPEED_INSIGHTS_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    return { success: false, error: SAFE_GENERIC };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { success: false, error: 'Invalid URL' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { success: false, error: 'Invalid URL' };
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return { success: false, error: 'Invalid URL' };
  }

  const endpoint = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  );
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('key', apiKey);

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    const status =
      err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network';
    logFailure(status);
    return { success: false, error: SAFE_GENERIC };
  }

  if (!response.ok) {
    logFailure(response.status);
    return { success: false, error: SAFE_GENERIC };
  }

  let body: unknown;
  try {
    const json: unknown = await response.json();
    body = json;
  } catch {
    logFailure(response.status);
    return { success: false, error: SAFE_GENERIC };
  }

  const extracted = extractSpeedGradeInput(body);
  if (!extracted.ok) {
    logFailure(response.status);
    return { success: false, error: SAFE_PARSE };
  }

  return { success: true, data: extracted.value };
}
