import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assertSafeUrl, safeFetch, readSafeResponseText } = vi.hoisted(() => ({
  assertSafeUrl: vi.fn(),
  safeFetch: vi.fn(),
  readSafeResponseText: vi.fn(),
}));

vi.mock('@/lib/security/safe-fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security/safe-fetch')>();
  return {
    ...actual,
    assertSafeUrl,
    safeFetch,
    readSafeResponseText,
  };
});

import { checkHttpsSecurity } from '@/lib/audit/httpsCheck';
import { SafeFetchError } from '@/lib/security/safe-fetch';

describe('checkHttpsSecurity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSafeUrl.mockResolvedValue(new URL('https://example.com'));
  });

  it('returns no flags when the URL fails safe-fetch validation', async () => {
    assertSafeUrl.mockRejectedValue(new SafeFetchError('Blocked hostname', 'BLOCKED_HOST'));

    await expect(checkHttpsSecurity('http://127.0.0.1')).resolves.toEqual([]);
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it('detects mixed content from a safe HTTPS response body', async () => {
    safeFetch.mockResolvedValue(new Response('', { status: 200 }));
    readSafeResponseText.mockResolvedValue(
      '<img src="http://example.com/image.png" />'
    );

    await expect(checkHttpsSecurity('https://example.com')).resolves.toContain(
      'mixed_content'
    );
  });
});
