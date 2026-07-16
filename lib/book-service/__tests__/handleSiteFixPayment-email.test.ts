import type Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';

import { resolveSiteFixNormalizedEmail } from '@/lib/book-service/handleSiteFixPayment';

function makeSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: 'cs_test',
    object: 'checkout.session',
    metadata: { orderId: 'order-123' },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe('resolveSiteFixNormalizedEmail', () => {
  it('prefers customer_details.email over empty metadata', () => {
    const session = makeSession({
      customer_details: { email: 'Buyer@Example.com' } as Stripe.Checkout.Session.CustomerDetails,
    });

    expect(resolveSiteFixNormalizedEmail(session, '')).toBe('buyer@example.com');
  });

  it('prefers customer_details.email over metadata normalizedEmail', () => {
    const session = makeSession({
      customer_details: { email: 'stripe@example.com' } as Stripe.Checkout.Session.CustomerDetails,
    });

    expect(resolveSiteFixNormalizedEmail(session, 'metadata@example.com')).toBe(
      'stripe@example.com'
    );
  });

  it('falls back to metadata when customer_details.email is absent', () => {
    const session = makeSession();

    expect(resolveSiteFixNormalizedEmail(session, 'Metadata@Example.com')).toBe(
      'metadata@example.com'
    );
  });

  it('logs and returns empty string when no email source exists', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeSession();

    expect(resolveSiteFixNormalizedEmail(session, '')).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no email resolved for orderId=order-123')
    );

    warnSpy.mockRestore();
  });
});
