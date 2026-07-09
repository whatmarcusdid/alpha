import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWithAdminAuth } = vi.hoisted(() => ({
  fetchWithAdminAuth: vi.fn(),
}));

vi.mock('@/lib/admin/fetch-with-auth', () => ({
  fetchWithAdminAuth,
}));

import { submitHostingContextConfirm } from '@/lib/fix-jobs/hosting-context-actions';

describe('submitHostingContextConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Confirm button calls PATCH with correct body', async () => {
    fetchWithAdminAuth.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            hostingContext: {
              host: 'kinsta',
              cms: 'wordpress',
              plugins: ['WP Rocket'],
              isConfirmed: true,
            },
          },
        }),
        { status: 200 }
      )
    );

    await submitHostingContextConfirm({
      fixJobId: 'session_1',
      uid: 'user_1',
      host: 'kinsta',
      cms: 'wordpress',
      plugins: ['WP Rocket'],
    });

    expect(fetchWithAdminAuth).toHaveBeenCalledWith(
      '/api/admin/fix-jobs/session_1/hosting-context',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          uid: 'user_1',
          host: 'kinsta',
          cms: 'wordpress',
          plugins: ['WP Rocket'],
        }),
      })
    );
  });

  it('API failure returns error message', async () => {
    fetchWithAdminAuth.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Fix job not found' }), { status: 404 })
    );

    const result = await submitHostingContextConfirm({
      fixJobId: 'session_1',
      uid: 'user_1',
      host: 'kinsta',
      cms: 'wordpress',
      plugins: [],
    });

    expect(result).toEqual({ success: false, error: 'Fix job not found' });
  });
});
