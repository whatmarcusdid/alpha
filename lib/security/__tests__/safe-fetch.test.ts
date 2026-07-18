import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SafeFetchError,
  assertSafeUrl,
  isBlockedIpAddress,
  isBlockedHostname,
  readSafeResponseText,
  safeFetch,
  safeFetchText,
  type HostnameResolver,
} from '@/lib/security/safe-fetch';

const PUBLIC_IP = '93.184.216.34';
const METADATA_IP = '169.254.169.254';
const LOOPBACK_IP = '127.0.0.1';

const safeResolver: HostnameResolver = async (hostname) => {
  if (hostname === 'example.com') {
    return [{ address: PUBLIC_IP, family: 4 }];
  }
  if (hostname === 'metadata.attacker.test') {
    return [{ address: METADATA_IP, family: 4 }];
  }
  if (hostname === 'rebind.test') {
    return [{ address: PUBLIC_IP, family: 4 }];
  }
  throw new Error(`Unexpected hostname in test resolver: ${hostname}`);
};

describe('isBlockedHostname / isBlockedIpAddress', () => {
  it('blocks localhost and private literal hostnames', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('127.0.0.1')).toBe(true);
    expect(isBlockedHostname('10.0.0.1')).toBe(true);
    expect(isBlockedHostname('172.16.0.1')).toBe(true);
    expect(isBlockedHostname('192.168.1.1')).toBe(true);
  });

  it('blocks cloud metadata IP and link-local range', () => {
    expect(isBlockedIpAddress(METADATA_IP)).toBe(true);
    expect(isBlockedIpAddress('169.254.0.1')).toBe(true);
  });

  it('blocks IPv6 loopback and link-local', () => {
    expect(isBlockedIpAddress('::1')).toBe(true);
    expect(isBlockedIpAddress('fe80::1')).toBe(true);
  });

  it('allows a public IPv4 address', () => {
    expect(isBlockedIpAddress(PUBLIC_IP)).toBe(false);
  });
});

describe('assertSafeUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toMatchObject({
      code: 'INVALID_URL',
    });
    await expect(assertSafeUrl('javascript:alert(1)')).rejects.toMatchObject({
      code: 'INVALID_URL',
    });
  });

  it('blocks loopback hostname literals', async () => {
    await expect(assertSafeUrl('http://127.0.0.1/')).rejects.toMatchObject({
      code: 'BLOCKED_HOST',
    });
  });

  it('blocks DNS-resolved cloud metadata address', async () => {
    await expect(
      assertSafeUrl('http://metadata.attacker.test/', safeResolver)
    ).rejects.toMatchObject({
      code: 'BLOCKED_IP',
    });
  });

  it('allows a safe external hostname when DNS resolves to public IP', async () => {
    const url = await assertSafeUrl('https://example.com/path', safeResolver);
    expect(url.hostname).toBe('example.com');
  });
});

describe('safeFetch redirect handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch);
  });

  it('blocks redirect to an internal address after an initially safe URL', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/internal' },
      })
    );

    await expect(
      safeFetch('http://rebind.test/start', {
        resolveHostnames: safeResolver,
        timeoutMs: 5_000,
      })
    ).rejects.toMatchObject({ code: 'BLOCKED_HOST' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a safe redirect chain and returns the final response', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: 'https://example.com/final' },
        })
      )
      .mockResolvedValueOnce(
        new Response('<html>ok</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );

    const response = await safeFetch('http://rebind.test/start', {
      resolveHostnames: safeResolver,
      timeoutMs: 5_000,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://example.com/final');
  });
});

describe('safeFetchText', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch);
  });

  it('returns response text for a safe URL', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('hello audit', { status: 200 })
    );

    const text = await safeFetchText('https://example.com', {
      resolveHostnames: safeResolver,
      timeoutMs: 5_000,
    });

    expect(text).toBe('hello audit');
  });
});

describe('readSafeResponseText', () => {
  it('rejects bodies over the configured limit', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(20));
        controller.close();
      },
    });

    await expect(readSafeResponseText(new Response(body), 10)).rejects.toMatchObject({
      code: 'RESPONSE_TOO_LARGE',
    });
  });
});

describe('SafeFetchError', () => {
  it('exposes a stable code property', () => {
    const error = new SafeFetchError('nope', 'BLOCKED_IP');
    expect(error.code).toBe('BLOCKED_IP');
  });
});
