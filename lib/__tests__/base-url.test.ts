import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAppBaseUrl } from '@/lib/base-url';

describe('getAppBaseUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns the configured value as-is and logs nothing when it is well-formed', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://my.bookservice.tech';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getAppBaseUrl()).toBe('https://my.bookservice.tech');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('falls back to the production default and warns when unset in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getAppBaseUrl()).toBe('https://my.bookservice.tech');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('is not set'));
  });

  it('falls back to localhost and warns when unset in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getAppBaseUrl()).toBe('http://localhost:3000');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('is not set'));
  });

  it('normalizes a value missing its protocol, warns, and does not throw', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'my.bookservice.tech';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => getAppBaseUrl()).not.toThrow();
    expect(getAppBaseUrl()).toBe('https://my.bookservice.tech');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('missing a protocol'));
  });

  it('falls back to the default, warns, and does not throw for a genuinely unusable value', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_APP_URL = 'not a url at all: ///';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => getAppBaseUrl()).not.toThrow();
    expect(getAppBaseUrl()).toBe('https://my.bookservice.tech');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('is not a usable URL'));
  });
});
