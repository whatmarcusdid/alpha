import { FieldValue } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type InviteWritePayload = Record<string, unknown>;

const { userSet, sendDashboardInviteEmail } = vi.hoisted(() => ({
  userSet: vi.fn(async (_payload: InviteWritePayload, _opts?: { merge: boolean }) =>
    undefined
  ),
  sendDashboardInviteEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {},
  adminDb: {
    collection: () => ({
      doc: () => ({
        set: userSet,
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
  });

  it('writes invite fields via dot paths so signup audit pre-fill is not clobbered (signup-then-invite)', async () => {
    await processDashboardInvite({
      userId: 'uid-signup-first',
      email: 'buyer@example.com',
      orderId: 'order-signup-first',
      sku: 'speed_fix',
    });

    expect(userSet).toHaveBeenCalledWith(
      {
        email: 'buyer@example.com',
        'siteFix.sku': 'speed_fix',
        'siteFix.entitlements': ['speed'],
        'siteFix.orderId': 'order-signup-first',
        'siteFix.inviteStatus': 'sent',
        'siteFix.invitedAt': expect.any(Object),
        'siteFix.acceptedAt': null,
        'siteFix.purchasedAt': expect.any(Object),
        'siteFix.activeFixSessionId': null,
      },
      { merge: true }
    );

    expect(userSet).toHaveBeenCalledOnce();
    const payload = userSet.mock.calls[0]![0];
    expect(payload).not.toHaveProperty('siteFix');
  });

  it('does not include audit pre-fill keys in the invite write payload', async () => {
    await processDashboardInvite({
      userId: 'uid-signup-first',
      email: 'buyer@example.com',
      orderId: 'order-signup-first',
      sku: 'speed_fix',
    });

    expect(userSet).toHaveBeenCalledOnce();
    const payload = userSet.mock.calls[0]![0];
    expect(payload['siteFix.businessName']).toBeUndefined();
    expect(payload['siteFix.websiteUrl']).toBeUndefined();
    expect(payload['siteFix.contactName']).toBeUndefined();
    expect(payload['siteFix.contactEmail']).toBeUndefined();
    expect(payload['siteFix.accountCreatedAt']).toBeUndefined();
  });
});
