import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifySessionCookie } = vi.hoisted(() => ({
  mockVerifySessionCookie: vi.fn(),
}));

vi.mock('@/lib/firebase/session', () => ({
  verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
}));

import { hasVerifiedSession } from '@/lib/middleware/session-guard';

describe('hasVerifiedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ valid: true }), { status: 200 }))
    );
  });

  it('returns false when __session cookie is absent', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard');

    await expect(hasVerifiedSession(request)).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns false when verify-session responds 401 (forged cookie)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ valid: false }), { status: 401 })
    );

    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: '__session=forged-cookie-value',
      },
    });

    await expect(hasVerifiedSession(request)).resolves.toBe(false);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe('http://localhost:3000/api/auth/verify-session');
    expect(options.method).toBe('GET');
    expect(options.cache).toBe('no-store');
    expect((options.headers as Record<string, string>).cookie).toContain(
      '__session=forged-cookie-value'
    );
  });

  it('returns true when verify-session responds 200', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: '__session=valid-cookie',
      },
    });

    await expect(hasVerifiedSession(request)).resolves.toBe(true);
  });

  it('fail-opens when verify-session responds 429 but session cookie is present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: '__session=valid-cookie',
      },
    });

    await expect(hasVerifiedSession(request)).resolves.toBe(true);
  });
});
