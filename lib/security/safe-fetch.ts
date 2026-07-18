import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type SafeFetchErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_HOST'
  | 'BLOCKED_IP'
  | 'TOO_MANY_REDIRECTS'
  | 'RESPONSE_TOO_LARGE'
  | 'TIMEOUT'
  | 'FETCH_FAILED';

export class SafeFetchError extends Error {
  readonly code: SafeFetchErrorCode;

  constructor(message: string, code: SafeFetchErrorCode) {
    super(message);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

export type HostnameResolver = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>;

export type SafeFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  /** Total time budget for the request including redirect hops. Default 10_000 ms. */
  timeoutMs?: number;
  /** Max response body bytes when using readSafeResponseText. Default 5_000_000. */
  maxResponseBytes?: number;
  /** Max redirect hops when followRedirects is true. Default 5. */
  maxRedirects?: number;
  /** Validate and follow redirects manually (default true). */
  followRedirects?: boolean;
  /** Injectable DNS resolver — used in tests. */
  resolveHostnames?: HostnameResolver;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 5_000_000;
const DEFAULT_MAX_REDIRECTS = 5;

const defaultHostnameResolver: HostnameResolver = async (hostname) =>
  lookup(hostname, { all: true });

/**
 * String-level hostname guard from the original PageSpeed blocklist.
 * Catches literal IPs/hostnames before DNS (fast reject).
 */
export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  if (h === 'localhost') {
    return true;
  }

  if (isIP(h) === 4) {
    return isBlockedIpv4Address(h);
  }

  if (isIP(h) === 6) {
    return isBlockedIpv6Address(h);
  }

  return false;
}

function parseIpv4Octets(ip: string): number[] | null {
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!ipv4Match) {
    return null;
  }

  const octets = [
    Number(ipv4Match[1]),
    Number(ipv4Match[2]),
    Number(ipv4Match[3]),
    Number(ipv4Match[4]),
  ];

  if (octets.some((n) => n > 255)) {
    return null;
  }

  return octets;
}

function isBlockedIpv4Octets(octets: number[]): boolean {
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
  if (a === 169 && b === 254) {
    return true;
  }

  return false;
}

export function isBlockedIpv4Address(ip: string): boolean {
  const octets = parseIpv4Octets(ip);
  if (!octets) {
    return true;
  }

  return isBlockedIpv4Octets(octets);
}

export function isBlockedIpv6Address(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('fe80:')) {
    return true;
  }

  return false;
}

export function isBlockedIpAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    return isBlockedIpv4Address(ip);
  }
  if (family === 6) {
    return isBlockedIpv6Address(ip);
  }

  return true;
}

function assertHttpOrHttpsProtocol(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeFetchError('Only http and https URLs are allowed', 'INVALID_URL');
  }
}

/**
 * Validates scheme, hostname literals, and all resolved addresses before any fetch.
 */
export async function assertSafeUrl(
  rawUrl: string | URL,
  resolveHostnames: HostnameResolver = defaultHostnameResolver
): Promise<URL> {
  let parsed: URL;

  try {
    parsed = rawUrl instanceof URL ? rawUrl : new URL(rawUrl);
  } catch {
    throw new SafeFetchError('Invalid URL', 'INVALID_URL');
  }

  assertHttpOrHttpsProtocol(parsed);

  if (!parsed.hostname) {
    throw new SafeFetchError('Invalid URL', 'INVALID_URL');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new SafeFetchError('Blocked hostname', 'BLOCKED_HOST');
  }

  let resolved: Array<{ address: string; family: number }>;
  try {
    resolved = await resolveHostnames(parsed.hostname);
  } catch {
    throw new SafeFetchError('Unable to resolve hostname', 'BLOCKED_HOST');
  }

  if (resolved.length === 0) {
    throw new SafeFetchError('Unable to resolve hostname', 'BLOCKED_HOST');
  }

  for (const { address } of resolved) {
    if (isBlockedIpAddress(address)) {
      throw new SafeFetchError(`Blocked IP address: ${address}`, 'BLOCKED_IP');
    }
  }

  return parsed;
}

function mergeSignals(
  timeoutMs: number,
  externalSignal?: AbortSignal
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!externalSignal) {
    return timeoutSignal;
  }

  return AbortSignal.any([timeoutSignal, externalSignal]);
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * SSRF-safe fetch: validates URL + resolved IPs before connecting, re-validates
 * each redirect hop, disables automatic redirect following.
 */
export async function safeFetch(
  rawUrl: string | URL,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    followRedirects = true,
    resolveHostnames = defaultHostnameResolver,
    signal,
  } = options;

  let currentUrl = await assertSafeUrl(rawUrl, resolveHostnames);
  let redirectCount = 0;

  while (true) {
    const response = await fetch(currentUrl.toString(), {
      method,
      headers,
      redirect: 'manual',
      signal: mergeSignals(timeoutMs, signal),
    });

    if (followRedirects && isRedirectStatus(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        return response;
      }

      redirectCount += 1;
      if (redirectCount > maxRedirects) {
        throw new SafeFetchError('Too many redirects', 'TOO_MANY_REDIRECTS');
      }

      currentUrl = new URL(location, currentUrl);
      await assertSafeUrl(currentUrl, resolveHostnames);
      continue;
    }

    return response;
  }
}

export async function readSafeResponseText(
  response: Response,
  maxBytes: number = DEFAULT_MAX_RESPONSE_BYTES
): Promise<string> {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      total += value.byteLength;
      if (total > maxBytes) {
        throw new SafeFetchError('Response body exceeds size limit', 'RESPONSE_TOO_LARGE');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export async function safeFetchText(
  rawUrl: string | URL,
  options: SafeFetchOptions = {}
): Promise<string> {
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const response = await safeFetch(rawUrl, options);

  if (!response.ok) {
    throw new SafeFetchError(
      `Request failed: ${response.status} ${response.statusText}`,
      'FETCH_FAILED'
    );
  }

  return readSafeResponseText(response, maxBytes);
}

export function isSafeFetchError(error: unknown): error is SafeFetchError {
  return error instanceof SafeFetchError;
}
