import { describe, expect, it } from 'vitest';

import { buildBookServiceConfirmationSuccessUrl } from '@/lib/book-service/build-confirmation-success-url';

describe('buildBookServiceConfirmationSuccessUrl', () => {
  it('always includes orderId and Stripe session_id placeholder', () => {
    const url = buildBookServiceConfirmationSuccessUrl(
      'http://localhost:3000',
      'order-123'
    );

    expect(url).toBe(
      'http://localhost:3000/book-service/confirmation?orderId=order-123&session_id={CHECKOUT_SESSION_ID}'
    );
  });

  it('includes email when normalizedEmail is known at checkout creation', () => {
    const url = buildBookServiceConfirmationSuccessUrl(
      'http://localhost:3000',
      'order-123',
      'buyer@example.com'
    );

    expect(url).toContain('email=buyer%40example.com');
    expect(url).toContain('session_id={CHECKOUT_SESSION_ID}');
  });
});
