import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mapAccessRequestErrorMessage,
  submitAccessDecline,
  submitAccessGrant,
} from '@/lib/site-access/client/access-request-page-logic';

describe('access request page logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mapAccessRequestErrorMessage: expired link', () => {
    expect(mapAccessRequestErrorMessage(400, 'This access link has expired')).toBe(
      'expired'
    );
  });

  it('mapAccessRequestErrorMessage: already used / invalid', () => {
    expect(mapAccessRequestErrorMessage(400, 'Invalid or expired access link')).toBe(
      'already_used'
    );
    expect(
      mapAccessRequestErrorMessage(400, 'This access link has already been used')
    ).toBe('already_used');
  });

  it('submitAccessGrant posts token to /api/site-access/grant', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { expiresAt: '2026-07-16T12:00:00.000Z' },
        }),
        { status: 200 }
      )
    );

    const result = await submitAccessGrant('abc123');

    expect(fetchMock).toHaveBeenCalledWith('/api/site-access/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'abc123' }),
    });
    expect(result).toEqual({
      state: 'success',
      expiresAt: '2026-07-16T12:00:00.000Z',
    });
  });

  it('submitAccessGrant: already-used token maps to already_used', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Invalid or expired access link' }),
        { status: 400 }
      )
    );

    const result = await submitAccessGrant('used-token');
    expect(result).toEqual({ state: 'already_used' });
  });

  it('submitAccessGrant: expired link maps to expired', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'This access link has expired' }), {
        status: 400,
      })
    );

    const result = await submitAccessGrant('expired-token');
    expect(result).toEqual({ state: 'expired' });
  });

  it('submitAccessGrant: API failure maps to error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
    );

    const result = await submitAccessGrant('token');
    expect(result).toEqual({ state: 'error' });
  });

  it('submitAccessDecline posts token to /api/site-access/decline', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const result = await submitAccessDecline('abc123');

    expect(fetchMock).toHaveBeenCalledWith('/api/site-access/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'abc123' }),
    });
    expect(result).toEqual({ state: 'success', expiresAt: '' });
  });

  it('submitAccessDecline: invalid token maps to already_used', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Invalid or expired access link' }),
        { status: 400 }
      )
    );

    const result = await submitAccessDecline('bad-token');
    expect(result).toEqual({ state: 'already_used' });
  });
});
