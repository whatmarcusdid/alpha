import type { SecurityGradeInput } from '@/lib/grading';

/**
 * Safe Browsing lookup; combine `flagged` with Sucuri output to build
 * {@link SecurityGradeInput} in the audit route.
 */

export type SafeBrowsingResult =
  | { success: true; flagged: boolean }
  | { success: false; error: string };

const PROVIDER = 'Google Safe Browsing';

function logFailure(statusCode: number | string): void {
  console.warn(PROVIDER, statusCode);
}

const SAFE_ERROR = 'Unable to verify site safety';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFindResponse(body: unknown): { flagged: boolean } | null {
  if (!isRecord(body)) {
    return null;
  }
  const matches = body.matches;
  if (matches === undefined) {
    return { flagged: false };
  }
  if (!Array.isArray(matches)) {
    return null;
  }
  return { flagged: matches.length > 0 };
}

export async function checkSafeBrowsing(url: string): Promise<SafeBrowsingResult> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    return { success: false, error: SAFE_ERROR };
  }

  const endpoint = new URL(
    'https://safebrowsing.googleapis.com/v4/threatMatches:find'
  );
  endpoint.searchParams.set('key', apiKey);

  const requestBody = {
    client: { clientId: 'tradesitegenie', clientVersion: '1.0' },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }],
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
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

  const parsed = parseFindResponse(body);
  if (parsed === null) {
    logFailure(response.status);
    return { success: false, error: SAFE_ERROR };
  }

  return { success: true, flagged: parsed.flagged };
}
