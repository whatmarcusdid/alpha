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

  async function postForKnownUser(email = 'known@example.com') {
    const response = await POST(makeRequest(email));
    expect(response.status).toBe(200);
    return response.json() as Promise<{ devResetToken?: string }>;
  }

  it('includes devResetToken when emulator host and non-production NODE_ENV', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'development');

    const body = await postForKnownUser('dev-token-on@example.com');

    expect(body.devResetToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it('omits devResetToken when emulator host set but NODE_ENV is production', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'production');

    const body = await postForKnownUser('dev-token-off-prod@example.com');

    expect(body.devResetToken).toBeUndefined();
  });

  it('omits devResetToken when NODE_ENV is non-production but emulator host unset', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    vi.stubEnv('NODE_ENV', 'development');

    const body = await postForKnownUser('dev-token-off-no-emulator@example.com');

    expect(body.devResetToken).toBeUndefined();
  });

  it('omits devResetToken when neither emulator host nor non-production NODE_ENV', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    vi.stubEnv('NODE_ENV', 'production');

    const body = await postForKnownUser('dev-token-off-neither@example.com');

    expect(body.devResetToken).toBeUndefined();
  });
});

describe('POST /api/auth/request-password-reset reset URL console log gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetUsers.mockResolvedValue({
      users: [{ uid: 'user_1', displayName: 'Test User' }],
    });
    vi.stubEnv('PASSWORD_RESET_EMAIL_MODE', 'console');
    vi.stubEnv('LOOPS_API_KEY', '');
  });

  async function postAndCaptureLogs(email: string) {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await POST(makeRequest(email));

    return { logSpy, warnSpy };
  }

  it('logs full reset URL only when emulator host and non-production NODE_ENV', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'development');

    const { logSpy, warnSpy } = await postAndCaptureLogs('log-gate-on@example.com');

    expect(logSpy).toHaveBeenCalledWith(
      '[Password Reset] Dev mode - reset URL:',
      expect.stringMatching(/\/reset-password\?token=[a-f0-9]{64}$/)
    );
    expect(warnSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('does not log reset URL when emulator host set but NODE_ENV is production', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'production');

    const { logSpy, warnSpy } = await postAndCaptureLogs('log-gate-prod@example.com');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[Password Reset] Loops not configured — reset URL not logged (production-safe)'
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('does not log reset URL when NODE_ENV is non-production but emulator host unset', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    vi.stubEnv('NODE_ENV', 'development');

    const { logSpy, warnSpy } = await postAndCaptureLogs('log-gate-no-emulator-dev@example.com');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[Password Reset] Loops not configured — reset URL not logged (production-safe)'
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('does not log reset URL when neither emulator host nor non-production NODE_ENV', async () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    vi.stubEnv('NODE_ENV', 'production');

    const { logSpy, warnSpy } = await postAndCaptureLogs('log-gate-neither@example.com');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[Password Reset] Loops not configured — reset URL not logged (production-safe)'
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
