import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDeletionAdd, mockUserGet, sendAccountDeletionConfirmationEmail, mockFetch } =
  vi.hoisted(() => ({
    mockDeletionAdd: vi.fn().mockResolvedValue(undefined),
    mockUserGet: vi.fn(),
    sendAccountDeletionConfirmationEmail: vi.fn(),
    mockFetch: vi.fn(),
  }));

vi.mock('@/lib/middleware/apiHandler', () => ({
  withAuthAndRateLimit: (
    handler: (req: NextRequest, context: { userId: string }) => Promise<Response>
  ) => {
    return (req: NextRequest) => handler(req, { userId: 'user-123' });
  },
}));

vi.mock('@/lib/middleware/rateLimiting', () => ({
  generalLimiter: {},
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: vi.fn(() => ({
            get: mockUserGet,
          })),
        };
      }

      if (name === 'deletionRequests') {
        return {
          add: mockDeletionAdd,
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  },
}));

vi.mock('@/lib/loops', () => ({
  sendAccountDeletionConfirmationEmail,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'server-timestamp') },
}));

vi.mock('@/lib/slack-enabled', () => ({
  isSlackNotificationsEnabled: () => false,
}));

import { POST } from '@/app/api/user/request-deletion/route';

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/user/request-deletion', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/user/request-deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        email: 'customer@example.com',
        fullName: 'Jane Doe',
      }),
    });
    sendAccountDeletionConfirmationEmail.mockResolvedValue({ success: true });
    vi.stubEnv('LOOPS_API_KEY', 'loops_test_key');
    vi.stubEnv('LOOPS_SUPPORT_TICKET_TEMPLATE_ID', 'support-template');
  });

  it('sends customer confirmation alongside internal support notification', async () => {
    const response = await POST(makeRequest({ reason: 'Switching providers' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("We've sent a confirmation email to customer@example.com");
    expect(mockDeletionAdd).toHaveBeenCalledTimes(1);
    expect(sendAccountDeletionConfirmationEmail).toHaveBeenCalledWith('customer@example.com', {
      firstName: 'Jane',
      submittedAt: expect.any(String),
      ticketId: expect.stringMatching(/^DEL-\d+$/),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.loops.so/api/v1/transactional',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('still succeeds when customer confirmation email fails', async () => {
    sendAccountDeletionConfirmationEmail.mockResolvedValue({
      success: false,
      error: 'LOOPS_ACCOUNT_DELETION_CONFIRMATION_TEMPLATE_ID not configured',
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe(
      "Your account deletion request has been submitted. We'll process your request within 48 hours."
    );
    expect(body.message).not.toContain('confirmation email');
    expect(mockDeletionAdd).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when user document is missing', async () => {
    mockUserGet.mockResolvedValue({ exists: false });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('User not found');
    expect(sendAccountDeletionConfirmationEmail).not.toHaveBeenCalled();
    expect(mockDeletionAdd).not.toHaveBeenCalled();
  });
});
