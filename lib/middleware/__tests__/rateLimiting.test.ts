import type { Ratelimit } from '@upstash/ratelimit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyRateLimit } from '@/lib/middleware/rateLimiting';

describe('applyRateLimit structured logging', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('logs a structured block message when limiter.limit() returns success: false', async () => {
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
      }),
    } as unknown as Ratelimit;

    const result = await applyRateLimit(mockLimiter, '203.0.113.10');

    expect(result.success).toBe(false);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[rate-limit] Limit exceeded — request blocked (limiter=ratelimit:unknown, identifier=203.0.113.10, limit=10, remaining=0)'
    );
  });

  it('does not log a block message when the limit check passes', async () => {
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
      }),
    } as unknown as Ratelimit;

    const result = await applyRateLimit(mockLimiter, '203.0.113.10');

    expect(result.success).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not log a block message when limiter is null (disabled)', async () => {
    const result = await applyRateLimit(null, '203.0.113.10');

    expect(result.success).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain(
      'Rate limiter not configured - request allowed without limit check'
    );
  });
});
