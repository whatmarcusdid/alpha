import { FieldValue } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type InviteUpdatePayload = Record<string, unknown>;

const { userGet, userSet, userUpdate, sendDashboardInviteEmail } = vi.hoisted(() => ({
  userGet: vi.fn(async () => ({ exists: true })),
  userSet: vi.fn(async () => undefined),
  userUpdate: vi.fn(async (_payload: InviteUpdatePayload) => undefined),
  sendDashboardInviteEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {},
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: userGet,
        set: userSet,
        update: userUpdate,
      }),
    }),
  },
}));

vi.mock('@/lib/book-service/emails', () => ({
  sendDashboardInviteEmail,
}));

import { processDashboardInvite } from '@/lib/book-service/dashboard-invite';

describe('processDashboardInvite — siteFix write scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userGet.mockResolvedValue({ exists: true });
  });

  it('uses .update() with dot paths when user doc already exists (signup-then-invite)', async () => {
    await processDashboardInvite({
      userId: 'uid-signup-first',
      email: 'buyer@example.com',
      orderId: 'order-signup-first',
      sku: 'speed_fix',
    });

    expect(userGet).toHaveBeenCalledOnce();
    expect(userSet).not.toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      'siteFix.sku': 'speed_fix',
      'siteFix.entitlements': ['speed'],
      'siteFix.orderId': 'order-signup-first',
      'siteFix.inviteStatus': 'sent',
      'siteFix.invitedAt': expect.any(Object),
      'siteFix.acceptedAt': null,
      'siteFix.purchasedAt': expect.any(Object),
      'siteFix.activeFixSessionId': null,
    });
  });

  it('creates minimal user doc with .set() then .update() when doc is missing (invite-first)', async () => {
    userGet.mockResolvedValueOnce({ exists: false });

    await processDashboardInvite({
      userId: 'uid-invite-first',
      email: 'buyer@example.com',
      orderId: 'order-invite-first',
      sku: 'speed_fix',
    });

    expect(userSet).toHaveBeenCalledWith({ email: 'buyer@example.com' }, { merge: true });
    expect(userUpdate).toHaveBeenCalledOnce();
    const updatePayload = userUpdate.mock.calls[0]![0];
    expect(updatePayload).not.toHaveProperty('siteFix');
    expect(updatePayload['siteFix.inviteStatus']).toBe('sent');
  });

  it('does not include audit pre-fill keys in the invite update payload', async () => {
    await processDashboardInvite({
      userId: 'uid-signup-first',
      email: 'buyer@example.com',
      orderId: 'order-signup-first',
      sku: 'speed_fix',
    });

    expect(userUpdate).toHaveBeenCalledOnce();
    const payload = userUpdate.mock.calls[0]![0];
    expect(payload['siteFix.businessName']).toBeUndefined();
    expect(payload['siteFix.websiteUrl']).toBeUndefined();
    expect(payload['siteFix.contactName']).toBeUndefined();
    expect(payload['siteFix.contactEmail']).toBeUndefined();
    expect(payload['siteFix.accountCreatedAt']).toBeUndefined();
  });
});
