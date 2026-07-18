import { describe, expect, it } from 'vitest';

import { AuditInputSchema } from '@/lib/types/audit';

describe('AuditInputSchema websiteUrl', () => {
  const base = {
    firstName: 'Pat',
    businessName: 'Pat Plumbing',
    email: 'pat@example.com',
  };

  it('accepts http and https URLs', () => {
    expect(
      AuditInputSchema.safeParse({ ...base, websiteUrl: 'https://example.com' }).success
    ).toBe(true);
    expect(
      AuditInputSchema.safeParse({ ...base, websiteUrl: 'http://example.com/path' }).success
    ).toBe(true);
  });

  it('rejects non-http(s) schemes before fetch', () => {
    const fileResult = AuditInputSchema.safeParse({
      ...base,
      websiteUrl: 'file:///etc/passwd',
    });
    expect(fileResult.success).toBe(false);

    const jsResult = AuditInputSchema.safeParse({
      ...base,
      websiteUrl: 'javascript:alert(1)',
    });
    expect(jsResult.success).toBe(false);
  });
});
