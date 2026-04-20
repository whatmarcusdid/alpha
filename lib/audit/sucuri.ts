import type { SecurityGradeInput } from '@/lib/grading';

/**
 * Sucuri SiteCheck scan; combine with Safe Browsing to build
 * {@link SecurityGradeInput} in the audit route.
 */

export type SucuriResult =
  | {
      success: true;
      flagged: boolean;
      missingHeadersCount: number;
      outdatedCms: boolean;
    }
  | { success: false; error: string };

const PROVIDER = 'Sucuri SiteCheck';

function logFailure(statusCode: number | string): void {
  console.warn(PROVIDER, statusCode);
}

const SAFE_ERROR = 'Unable to scan site security';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countMissingSecurityHeaders(securityHeaders: unknown): number {
  if (!isRecord(securityHeaders)) {
    return 0;
  }
  let count = 0;
  for (const key of Object.keys(securityHeaders)) {
    const v = securityHeaders[key];
    if (v === false) {
      count += 1;
    }
  }
  return count;
}

function parseScanResponse(body: unknown): {
  flagged: boolean;
  missingHeadersCount: number;
  outdatedCms: boolean;
} | null {
  if (!isRecord(body)) {
    return null;
  }

  const blacklists = body.blacklists;
  const flagged =
    isRecord(blacklists) && Object.keys(blacklists).length > 0;

  const missingHeadersCount = countMissingSecurityHeaders(body.security_headers);

  let outdatedCms = false;
  const system = body.system;
  if (isRecord(system)) {
    const cms = system.cms;
    if (isRecord(cms) && cms.outdated === true) {
      outdatedCms = true;
    }
  }

  return { flagged, missingHeadersCount, outdatedCms };
}

export async function checkSucuri(url: string): Promise<SucuriResult> {
  const endpoint = new URL('https://sitecheck.sucuri.net/api/v3/');
  endpoint.searchParams.set('scan', url);

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    const status =
      err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network';
    logFailure(status);
    return { success: false, error: SAFE_ERROR };
  }

  if (!response.ok) {
    logFailure(response.status);
    return { success: false, error: SAFE_ERROR };
  }

  let body: unknown;
  try {
    const json: unknown = await response.json();
    body = json;
  } catch {
    logFailure(response.status);
    return { success: false, error: SAFE_ERROR };
  }

  const parsed = parseScanResponse(body);
  if (parsed === null) {
    logFailure(response.status);
    return { success: false, error: SAFE_ERROR };
  }

  return {
    success: true,
    flagged: parsed.flagged,
    missingHeadersCount: parsed.missingHeadersCount,
    outdatedCms: parsed.outdatedCms,
  };
}
