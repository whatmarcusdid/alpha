import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  pendingGet,
  auditLeadGet,
  userGet,
  userSet,
  pendingUpdate,
  batchCommit,
  createUser,
  getUserByEmail,
} = vi.hoisted(() => ({
  pendingGet: vi.fn(),
  auditLeadGet: vi.fn(),
  userGet: vi.fn(),
  userSet: vi.fn(),
  pendingUpdate: vi.fn(),
  batchCommit: vi.fn(async () => undefined),
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    createUser,
    getUserByEmail,
  },
  adminDb: {
    collection: (name: string) => {
      if (name === 'pending_orders') {
        return {
          doc: () => ({
            get: pendingGet,
            __pendingRef: true,
          }),
        };
      }
      if (name === 'auditLeads') {
        return {
          doc: () => ({
            get: auditLeadGet,
          }),
        };
      }
      if (name === 'users') {
        return {
          doc: () => ({
            get: userGet,
            __userRef: true,
          }),
        };
      }
      throw new Error(`Unexpected Firestore collection in test: ${name}`);
    },
    batch: () => ({
      set: (ref: { __userRef?: boolean }, data: unknown, _opts?: unknown) => {
        if (ref.__userRef) userSet(data);
      },
      update: (ref: { __pendingRef?: boolean }, data: unknown) => {
        if (ref.__pendingRef) pendingUpdate(data);
      },
      commit: batchCommit,
    }),
  },
}));

import {
  AuthError,
  ClaimError,
  createUserWithSiteFixOrder,
} from '@/lib/book-service/createUser';

const orderId = 'order-create-user-test';
const auditLeadId = 'audit-lead-create-user-test';
const normalizedEmail = 'buyer@example.com';

const unclaimedPending = {
  orderId,
  auditLeadId,
  sku: 'speed_fix',
  entitlements: ['speed'],
  normalizedEmail,
  claimState: 'unclaimed',
  claimedByUserId: null,
  claimedAt: null,
};

describe('createUserWithSiteFixOrder — auditLeadLinked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingGet.mockResolvedValue({ exists: true, data: () => unclaimedPending });
    userGet.mockResolvedValue({ exists: false, data: () => undefined });
    createUser.mockResolvedValue({ uid: 'uid-new-user' });
  });

  it('creates the account with auditLeadLinked: true when the audit lead exists', async () => {
    auditLeadGet.mockResolvedValue({
      exists: true,
      data: () => ({
        firstName: 'Jane',
        businessName: 'Jane Co',
        email: normalizedEmail,
        websiteUrl: 'https://example.com',
      }),
    });

    const result = await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(result).toEqual({ uid: 'uid-new-user', orderId });
    expect(userSet).toHaveBeenCalledWith({
      siteFix: expect.objectContaining({
        businessName: 'Jane Co',
        websiteUrl: 'https://example.com',
        contactName: 'Jane',
        contactEmail: normalizedEmail,
      }),
      auditLeadLinked: true,
    });
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('creates the account with auditLeadLinked: false when the audit lead is missing', async () => {
    auditLeadGet.mockResolvedValue({ exists: false });

    const result = await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(result).toEqual({ uid: 'uid-new-user', orderId });
    expect(userSet).toHaveBeenCalledWith({
      siteFix: expect.objectContaining({
        businessName: '',
        websiteUrl: '',
        contactName: '',
        contactEmail: normalizedEmail,
      }),
      auditLeadLinked: false,
    });
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('still throws ClaimError when pending_orders is not found', async () => {
    pendingGet.mockResolvedValue({ exists: false });

    await expect(
      createUserWithSiteFixOrder({
        email: normalizedEmail,
        password: 'password123',
        orderId,
      })
    ).rejects.toBeInstanceOf(ClaimError);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('still throws ClaimError when the order is already claimed by another user', async () => {
    pendingGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ...unclaimedPending,
        claimState: 'claimed',
        claimedByUserId: 'other-uid',
      }),
    });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        siteFix: { orderId: 'different-order' },
      }),
    });

    await expect(
      createUserWithSiteFixOrder({
        email: normalizedEmail,
        password: 'password123',
        orderId,
      })
    ).rejects.toBeInstanceOf(ClaimError);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('still throws AuthError when email is already in use for a different order', async () => {
    auditLeadGet.mockResolvedValue({ exists: false });
    createUser.mockRejectedValue({ code: 'auth/email-already-exists' });
    getUserByEmail.mockResolvedValue({ uid: 'existing-uid' });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        siteFix: { orderId: 'different-order' },
      }),
    });

    await expect(
      createUserWithSiteFixOrder({
        email: normalizedEmail,
        password: 'password123',
        orderId,
      })
    ).rejects.toBeInstanceOf(AuthError);
  });
});
