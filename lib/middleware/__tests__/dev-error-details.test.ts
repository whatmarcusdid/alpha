import { afterEach, describe, expect, it, vi } from 'vitest';

import { devOnlyErrorDetails } from '@/lib/middleware/dev-error-details';

describe('devOnlyErrorDetails', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns no details in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(devOnlyErrorDetails(new Error('secret stripe failure'))).toEqual({});
  });

  it('returns details in development', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(devOnlyErrorDetails(new Error('secret stripe failure'))).toEqual({
      details: 'secret stripe failure',
    });
  });

  it('supports plain objects with message for development', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(devOnlyErrorDetails({ message: 'webhook signature mismatch' })).toEqual({
      details: 'webhook signature mismatch',
    });
  });
});
