import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSet, mockGetUsers } = vi.hoisted(() => ({
  mockSet: vi.fn().mockResolvedValue(undefined),
  mockGetUsers: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    getUsers: (...args: unknown[]) => mockGetUsers(...args),
  },
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({ set: mockSet }),
    }),
  },
}));

vi.mock('@/lib/loops', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn() },
}));

import { POST } from '@/app/api/auth/request-password-reset/route';

function makeRequest(email: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/request-password-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ email }),
  });
}

describe('POST /api/auth/request-password-reset devResetToken gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetUsers.mockResolvedValue({
      users: [{ uid: 'user_1', displayName: 'Test User' }],
    });
    vi.stubEnv('PASSWORD_RESET_EMAIL_MODE', 'console');
    vi.stubEnv('LOOPS_API_KEY', '');
  });

  async function postForKnownUser() {
    const response = await POST(makeRequest('known@example.com'));
    expect(response.status).toBe(200);
    return response.json() as Promise<{ devResetToken?: string }>;
  }

  it('includes devResetToken when emulator host and non-production NODE_ENV', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'development');

    const body = await postForKnownUser();

    expect(body.devResetToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it('omits devResetToken when emulator host set but NODE_ENV is production', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'production');

    const body = await postForKnownUser();

    expect(body.devResetToken).toBeUndefined();
  });

  it('omits devResetToken when NODE_ENV is non-production but emulator host unset', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    vi.stubEnv('NODE_ENV', 'development');

    const body = await postForKnownUser();

    expect(body.devResetToken).toBeUndefined();
  });

  it('omits devResetToken when neither emulator host nor non-production NODE_ENV', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    vi.stubEnv('NODE_ENV', 'production');

    const body = await postForKnownUser();

    expect(body.devResetToken).toBeUndefined();
  });
});
