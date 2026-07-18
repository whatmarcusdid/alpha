import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { devOnlyErrorDetails } from '@/lib/middleware/dev-error-details';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import { PRICING } from '@/lib/stripe';
import { validateRequestBody, createSubscriptionSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(async (request, { userId }) => {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const validation = await validateRequestBody(request, createSubscriptionSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { email, tier, billingCycle, couponCode, paymentMethodId } = validation.data;

    const pricingData = PRICING[tier as keyof typeof PRICING];
    const priceId = pricingData.stripePriceId;

    let customer: Stripe.Customer;
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const existingCustomerId = userData?.subscription?.stripeCustomerId;

    if (existingCustomerId) {
      customer = (await stripe.customers.retrieve(existingCustomerId)) as Stripe.Customer;
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      });

      await adminDb.collection('users').doc(userId).update({
        'subscription.stripeCustomerId': customer.id,
        'subscription.updatedAt': new Date().toISOString(),
      });
    }

    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
        tier: tier,
        billingCycle: billingCycle,
      },
    };

    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid !== false) {
          (subscriptionParams as Stripe.SubscriptionCreateParams & { coupon?: string }).coupon =
            couponCode;

          if (subscriptionParams.metadata) {
            subscriptionParams.metadata.couponApplied = couponCode;
            if (coupon.percent_off) {
              subscriptionParams.metadata.discountPercent = coupon.percent_off.toString();
            }
            if (coupon.amount_off) {
              subscriptionParams.metadata.discountAmount = (coupon.amount_off / 100).toString();
            }
          }
        }
      } catch (error) {
        console.error('Error validating coupon for subscription:', error);
      }
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    let discountInfo = null;
    if (couponCode && (subscription as any).discount) {
      const coupon = (subscription as any).discount.coupon;
      discountInfo = {
        couponCode: couponCode,
        percentOff: coupon.percent_off || null,
        amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
      };
    }

    await adminDb.collection('users').doc(userId).update({
      'subscription.tier': tier,
      'subscription.status': subscription.status,
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.stripeCustomerId': customer.id,
      'subscription.billingCycle': billingCycle,
      'subscription.startDate': new Date((subscription as any).current_period_start * 1000).toISOString(),
      'subscription.renewalDate': new Date((subscription as any).current_period_end * 1000).toISOString(),
      'subscription.couponApplied': discountInfo?.couponCode || null,
      'subscription.discount': discountInfo || null,
      'subscription.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      },
      discount: discountInfo,
    });
  } catch (error: unknown) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create subscription',
        ...devOnlyErrorDetails(error),
      },
      { status: 500 }
    );
  }
}, checkoutLimiter);
