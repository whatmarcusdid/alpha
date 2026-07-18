import { beforeEach, describe, expect, it, vi } from 'vitest';

const { safeFetch, readSafeResponseText } = vi.hoisted(() => ({
  safeFetch: vi.fn(),
  readSafeResponseText: vi.fn(),
}));

vi.mock('@/lib/security/safe-fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security/safe-fetch')>();
  return {
    ...actual,
    safeFetch,
    readSafeResponseText,
  };
});

import { crawlPage } from '@/lib/audit/crawlPage';

describe('crawlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses safeFetch and returns HTML for successful responses', async () => {
    safeFetch.mockResolvedValue(new Response('', { status: 200 }));
    readSafeResponseText.mockResolvedValue('<html>audit</html>');

    await expect(crawlPage('https://example.com')).resolves.toBe('<html>audit</html>');

    expect(safeFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        timeoutMs: 10_000,
        maxResponseBytes: 5_000_000,
      })
    );
  });

  it('throws when safeFetch returns a non-OK response', async () => {
    safeFetch.mockResolvedValue(new Response('', { status: 500 }));

    await expect(crawlPage('https://example.com')).rejects.toThrow(
      'crawlPage failed: 500 https://example.com'
    );
  });
});
