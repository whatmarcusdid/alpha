import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter as bookServiceCheckoutLimiter } from '@/lib/middleware/rateLimiting';
import { buildBookServiceConfirmationSuccessUrl } from '@/lib/book-service/build-confirmation-success-url';
import { buildSiteFixMetadata } from '@/lib/book-service/stripe-metadata';
import { getSKUPriceMap } from '@/lib/book-service/skus';
import { warnIfBaseUrlLooksWrong } from '@/lib/book-service/validate-base-url';
import { getAppBaseUrl as resolveAppBaseUrl } from '@/lib/base-url';
import { getStripe } from '@/lib/stripe-server';

const bookServiceCheckoutSchema = z.object({
  auditLeadId: z.string().min(1),
  sku: z.enum([
    'speed_fix',
    'security_fix',
    'seo_ai_visibility_fix',
    'full_bundle',
  ]),
  normalizedEmail: z.string().email().optional().or(z.literal('')),
});

function getAppBaseUrl(): string {
  warnIfBaseUrlLooksWrong();
  return resolveAppBaseUrl();
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = bookServiceCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const { auditLeadId, sku, normalizedEmail: rawEmail } = parsed.data;
    const normalizedEmail = rawEmail?.trim()
      ? rawEmail.toLowerCase().trim()
      : undefined;
    const orderId = crypto.randomUUID();
    const priceId = getSKUPriceMap()[sku];
    const baseUrl = getAppBaseUrl();

    const metadata = buildSiteFixMetadata({
      orderId,
      auditLeadId,
      sku,
      normalizedEmail: normalizedEmail ?? '',
    });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        productType: metadata.productType,
        orderId: metadata.orderId,
        auditLeadId: metadata.auditLeadId,
        sku: metadata.sku,
        normalizedEmail: metadata.normalizedEmail,
      },
      success_url: buildBookServiceConfirmationSuccessUrl(
        baseUrl,
        orderId,
        normalizedEmail
      ),
      cancel_url: `${baseUrl}/book-service/select`,
      ...(normalizedEmail
        ? { customer_email: normalizedEmail.toLowerCase().trim() }
        : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { url: session.url },
    });
  } catch (error) {
    console.error('[book-service/checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}, bookServiceCheckoutLimiter);
