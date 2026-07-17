import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  orderGet,
  auditLeadGet,
  orderSet,
  pendingOrderSet,
  batchCommit,
  auditLeadsUpdate,
  sendSiteFixPaymentConfirmedEmail,
} = vi.hoisted(() => ({
  orderGet: vi.fn(),
  auditLeadGet: vi.fn(),
  orderSet: vi.fn(),
  pendingOrderSet: vi.fn(),
  batchCommit: vi.fn(async () => undefined),
  auditLeadsUpdate: vi.fn(async () => undefined),
  sendSiteFixPaymentConfirmedEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name === 'orders') {
        return { doc: () => ({ __collection: 'orders', get: orderGet }) };
      }
      if (name === 'pending_orders') {
        return { doc: () => ({ __collection: 'pending_orders' }) };
      }
      if (name === 'auditLeads') {
        return {
          doc: () => ({
            get: auditLeadGet,
            update: auditLeadsUpdate,
          }),
        };
      }
      if (name === 'analyticsEvents') {
        return { add: vi.fn(async () => undefined) };
      }
      throw new Error(`Unexpected Firestore collection in test: ${name}`);
    },
    batch: () => ({
      set: (ref: { __collection: string }, data: unknown) => {
        if (ref.__collection === 'orders') orderSet(data);
        if (ref.__collection === 'pending_orders') pendingOrderSet(data);
      },
      commit: batchCommit,
    }),
  },
}));

vi.mock('@/lib/book-service/emails', () => ({
  sendSiteFixPaymentConfirmedEmail,
}));

vi.mock('@/lib/book-service/dashboard-invite', () => ({
  resolveOrCreateUserIdForInvite: vi.fn(async () => null),
  processDashboardInvite: vi.fn(),
}));

import { handleSiteFixPayment } from '@/lib/book-service/handleSiteFixPayment';

function makeSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_audit_lead_link',
    object: 'checkout.session',
    payment_intent: 'pi_test_audit_lead_link',
    customer_details: { email: 'buyer@example.com' } as Stripe.Checkout.Session.CustomerDetails,
    metadata: {
      productType: 'site_fix',
      orderId: 'order-audit-lead-link-test',
      auditLeadId: 'audit-lead-link-test',
      sku: 'speed_fix',
      normalizedEmail: '',
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe('handleSiteFixPayment — auditLeadLinked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderGet.mockResolvedValue({ exists: false });
  });

  it('writes auditLeadLinked: true and updates auditLeads when the lead exists', async () => {
    auditLeadGet.mockResolvedValue({ exists: true });

    await handleSiteFixPayment(makeSession());

    expect(orderSet).toHaveBeenCalledWith(
      expect.objectContaining({ auditLeadLinked: true })
    );
    expect(pendingOrderSet).toHaveBeenCalledWith(
      expect.objectContaining({ auditLeadLinked: true })
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(auditLeadsUpdate).toHaveBeenCalledWith({
      orderId: 'order-audit-lead-link-test',
    });
  });

  it('writes auditLeadLinked: false and skips auditLeads update when the lead is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    auditLeadGet.mockResolvedValue({ exists: false });

    await handleSiteFixPayment(makeSession());

    expect(orderSet).toHaveBeenCalledWith(
      expect.objectContaining({ auditLeadLinked: false })
    );
    expect(pendingOrderSet).toHaveBeenCalledWith(
      expect.objectContaining({ auditLeadLinked: false })
    );
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(auditLeadsUpdate).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'audit lead not found for auditLeadId=audit-lead-link-test — writing auditLeadLinked=false'
      )
    );

    warnSpy.mockRestore();
  });

  it('still commits the order batch when the audit lead is missing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    auditLeadGet.mockResolvedValue({ exists: false });

    await expect(handleSiteFixPayment(makeSession())).resolves.toBeUndefined();

    expect(orderSet).toHaveBeenCalledTimes(1);
    expect(pendingOrderSet).toHaveBeenCalledTimes(1);
  });
});
