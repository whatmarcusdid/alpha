import { describe, expect, it, vi } from 'vitest';

import {
  assertLiveFirestoreForProductionFlag,
  clearFirebaseEmulatorEnv,
  isDevTokenExposureEnabled,
} from '@/lib/firebase/emulator-env';

describe('emulator-env', () => {
  it('isDevTokenExposureEnabled requires emulator host AND non-production NODE_ENV', () => {
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
    vi.stubEnv('NODE_ENV', 'development');
    expect(isDevTokenExposureEnabled()).toBe(true);

    vi.stubEnv('NODE_ENV', 'production');
    expect(isDevTokenExposureEnabled()).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '');
    expect(isDevTokenExposureEnabled()).toBe(false);

    vi.stubEnv('NODE_ENV', 'production');
    expect(isDevTokenExposureEnabled()).toBe(false);

    vi.unstubAllEnvs();
  });

  it('clearFirebaseEmulatorEnv removes all emulator host vars', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

    clearFirebaseEmulatorEnv();

    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined();
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeUndefined();
    expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBeUndefined();
  });

  it('assertLiveFirestoreForProductionFlag clears emulator vars when --production', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    assertLiveFirestoreForProductionFlag(true);

    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined();
  });

  it('assertLiveFirestoreForProductionFlag is a no-op without --production', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    assertLiveFirestoreForProductionFlag(false);

    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
    delete process.env.FIRESTORE_EMULATOR_HOST;
  });
});
