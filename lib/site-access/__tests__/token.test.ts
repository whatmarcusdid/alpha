import { describe, expect, it } from 'vitest';

import {
  generateAccessToken,
  hashAccessToken,
  verifyAccessToken,
} from '@/lib/site-access/token';

describe('site access token utilities', () => {
  it('generateAccessToken returns 64 hex chars', () => {
    const token = generateAccessToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('hashAccessToken is deterministic for same input', () => {
    const hash1 = hashAccessToken('same-token');
    const hash2 = hashAccessToken('same-token');
    expect(hash1).toBe(hash2);
  });

  it('hashAccessToken produces different output for different inputs', () => {
    const hash1 = hashAccessToken('token-a');
    const hash2 = hashAccessToken('token-b');
    expect(hash1).not.toBe(hash2);
  });

  it('verifyAccessToken: correct token returns true', () => {
    const rawToken = generateAccessToken();
    const storedHash = hashAccessToken(rawToken);
    expect(verifyAccessToken(rawToken, storedHash)).toBe(true);
  });

  it('verifyAccessToken: wrong token returns false', () => {
    const storedHash = hashAccessToken('correct-token');
    expect(verifyAccessToken('wrong-token', storedHash)).toBe(false);
  });

  it('verifyAccessToken: timing-safe (no early exit on mismatch)', () => {
    const storedHash = hashAccessToken('correct-token');
    const mismatchedHash = hashAccessToken('wrong-token');

    expect(storedHash).not.toBe(mismatchedHash);
    expect(verifyAccessToken('wrong-token', storedHash)).toBe(false);
    expect(verifyAccessToken('correct-token', storedHash)).toBe(true);
  });
});
