import { Timestamp } from 'firebase-admin/firestore';
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
  updateUser,
} = vi.hoisted(() => ({
  pendingGet: vi.fn(),
  auditLeadGet: vi.fn(),
  userGet: vi.fn(),
  userSet: vi.fn(),
  pendingUpdate: vi.fn(),
  batchCommit: vi.fn(async () => undefined),
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    createUser,
    getUserByEmail,
    updateUser,
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
  isSiteFixAccountSetupComplete,
  mergeSiteFixForAccountSetup,
} from '@/lib/book-service/createUser';
import type { SiteFixEntitlement } from '@/lib/book-service/skus';

const orderId = 'order-create-user-test';
const auditLeadId = 'audit-lead-create-user-test';
const normalizedEmail = 'buyer@example.com';
const inviteUid = 'uid-from-dashboard-invite';

const speedEntitlement = ['speed'] satisfies SiteFixEntitlement[];

const unclaimedPending = {
  orderId,
  auditLeadId,
  sku: 'speed_fix',
  entitlements: speedEntitlement,
  normalizedEmail,
  claimState: 'unclaimed',
  claimedByUserId: null,
  claimedAt: null,
};

const linkedAuditLead = {
  firstName: 'Jane',
  businessName: 'Jane Co',
  email: normalizedEmail,
  websiteUrl: 'https://example.com',
};

const partialInviteSiteFix = {
  sku: 'speed_fix',
  entitlements: speedEntitlement,
  orderId,
  inviteStatus: 'sent',
  invitedAt: Timestamp.fromDate(new Date('2026-07-17T12:00:00Z')),
  acceptedAt: null,
  purchasedAt: Timestamp.fromDate(new Date('2026-07-17T12:00:00Z')),
  activeFixSessionId: null,
};

const completeSiteFix = {
  orderId,
  auditLeadId,
  claimedByUserId: inviteUid,
  purchasedPackages: speedEntitlement,
  onboardingStatus: 'awaiting_access' as const,
  businessName: 'Jane Co',
  websiteUrl: 'https://example.com',
  contactName: 'Jane',
  contactEmail: normalizedEmail,
  access_request: { submittedAt: null, method: null, notes: null },
  onboardingCompletedAt: null,
  accountCreatedAt: Timestamp.fromDate(new Date('2026-07-17T12:05:00Z')),
  inviteStatus: 'sent',
};

describe('mergeSiteFixForAccountSetup', () => {
  it('fills audit fields into a partial invite siteFix without removing invite metadata', () => {
    const merged = mergeSiteFixForAccountSetup({
      existingSiteFix: partialInviteSiteFix,
      uid: inviteUid,
      orderId,
      auditLeadId,
      entitlements: speedEntitlement,
      auditLead: linkedAuditLead,
      auditLeadLinked: true,
      normalizedEmail,
    });

    expect(merged.businessName).toBe('Jane Co');
    expect(merged.contactName).toBe('Jane');
    expect(merged.inviteStatus).toBe('sent');
    expect(merged.claimedByUserId).toBe(inviteUid);
    expect(merged.accountCreatedAt).toBeDefined();
  });

  it('leaves contact fields blank when the audit lead is unlinked (#35)', () => {
    const merged = mergeSiteFixForAccountSetup({
      existingSiteFix: partialInviteSiteFix,
      uid: inviteUid,
      orderId,
      auditLeadId,
      entitlements: speedEntitlement,
      auditLead: null,
      auditLeadLinked: false,
      normalizedEmail,
    });

    expect(merged.businessName).toBe('');
    expect(merged.websiteUrl).toBe('');
    expect(merged.contactName).toBe('');
    expect(merged.contactEmail).toBe(normalizedEmail);
  });

  it('does not overwrite non-empty fields already on siteFix', () => {
    const merged = mergeSiteFixForAccountSetup({
      existingSiteFix: {
        ...partialInviteSiteFix,
        businessName: 'User corrected name',
        contactEmail: 'corrected@example.com',
      },
      uid: inviteUid,
      orderId,
      auditLeadId,
      entitlements: speedEntitlement,
      auditLead: linkedAuditLead,
      auditLeadLinked: true,
      normalizedEmail,
    });

    expect(merged.businessName).toBe('User corrected name');
    expect(merged.contactEmail).toBe('corrected@example.com');
    expect(merged.contactName).toBe('Jane');
  });
});

describe('isSiteFixAccountSetupComplete', () => {
  it('returns true only when claimedByUserId and accountCreatedAt are set', () => {
    expect(isSiteFixAccountSetupComplete(completeSiteFix, inviteUid)).toBe(true);
    expect(
      isSiteFixAccountSetupComplete(
        { ...completeSiteFix, accountCreatedAt: undefined },
        inviteUid
      )
    ).toBe(false);
  });
});

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
      data: () => linkedAuditLead,
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
    expect(pendingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        claimState: 'claimed',
        claimedByUserId: 'uid-new-user',
      })
    );
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

  it('completes setup when dashboard invite created a partial siteFix first (invite-then-signup)', async () => {
    auditLeadGet.mockResolvedValue({
      exists: true,
      data: () => linkedAuditLead,
    });
    createUser.mockRejectedValue({ code: 'auth/email-already-exists' });
    getUserByEmail.mockResolvedValue({ uid: inviteUid });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({ siteFix: partialInviteSiteFix }),
    });

    const result = await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(result).toEqual({ uid: inviteUid, orderId });
    expect(updateUser).toHaveBeenCalledWith(inviteUid, {
      password: 'password123',
    });
    expect(userSet).toHaveBeenCalledWith({
      siteFix: expect.objectContaining({
        businessName: 'Jane Co',
        websiteUrl: 'https://example.com',
        contactName: 'Jane',
        contactEmail: normalizedEmail,
        inviteStatus: 'sent',
        claimedByUserId: inviteUid,
        accountCreatedAt: expect.anything(),
      }),
      auditLeadLinked: true,
    });
    expect(pendingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        claimState: 'claimed',
        claimedByUserId: inviteUid,
      })
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('leaves fields blank for invite-first signup when audit lead is unlinked (#35)', async () => {
    auditLeadGet.mockResolvedValue({ exists: false });
    createUser.mockRejectedValue({ code: 'auth/email-already-exists' });
    getUserByEmail.mockResolvedValue({ uid: inviteUid });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({ siteFix: partialInviteSiteFix }),
    });

    await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(userSet).toHaveBeenCalledWith({
      siteFix: expect.objectContaining({
        businessName: '',
        websiteUrl: '',
        contactName: '',
        contactEmail: normalizedEmail,
      }),
      auditLeadLinked: false,
    });
  });

  it('is idempotent when account setup is already complete and pending is claimed', async () => {
    pendingGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ...unclaimedPending,
        claimState: 'claimed',
        claimedByUserId: inviteUid,
      }),
    });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({ siteFix: completeSiteFix, auditLeadLinked: true }),
    });

    const result = await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(result).toEqual({ uid: inviteUid, orderId });
    expect(createUser).not.toHaveBeenCalled();
    expect(userSet).not.toHaveBeenCalled();
    expect(pendingUpdate).not.toHaveBeenCalled();
    expect(batchCommit).not.toHaveBeenCalled();
  });

  it('claims pending but does not rewrite siteFix when setup is complete and pending is still unclaimed', async () => {
    auditLeadGet.mockResolvedValue({
      exists: true,
      data: () => linkedAuditLead,
    });
    createUser.mockRejectedValue({ code: 'auth/email-already-exists' });
    getUserByEmail.mockResolvedValue({ uid: inviteUid });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        siteFix: completeSiteFix,
        auditLeadLinked: true,
      }),
    });

    const result = await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(result).toEqual({ uid: inviteUid, orderId });
    expect(userSet).not.toHaveBeenCalled();
    expect(pendingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        claimState: 'claimed',
        claimedByUserId: inviteUid,
      })
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite auditLeadLinked when it is already set on the user doc', async () => {
    auditLeadGet.mockResolvedValue({ exists: false });
    createUser.mockRejectedValue({ code: 'auth/email-already-exists' });
    getUserByEmail.mockResolvedValue({ uid: inviteUid });
    userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        auditLeadLinked: true,
        siteFix: partialInviteSiteFix,
      }),
    });

    await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password: 'password123',
      orderId,
    });

    expect(userSet).toHaveBeenCalledWith({
      siteFix: expect.any(Object),
    });
    expect(userSet.mock.calls[0][0]).not.toHaveProperty('auditLeadLinked');
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
