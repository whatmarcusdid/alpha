import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { PRICING } from '@/lib/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { email, tier, billingCycle, couponCode, paymentMethodId } = await request.json();

    // Validate required fields
    if (!email || !tier || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the Stripe price ID for the tier
    const pricingData = PRICING[tier as keyof typeof PRICING];
    if (!pricingData) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
        { status: 400 }
      );
    }

    const priceId = pricingData.stripePriceId;

    // Check if customer already exists
    let customer: Stripe.Customer;
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const existingCustomerId = userData?.subscription?.stripeCustomerId;

    if (existingCustomerId) {
      // Retrieve existing customer
      customer = await stripe.customers.retrieve(existingCustomerId) as Stripe.Customer;
    } else {
      // Create new Stripe customer
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      });

      // Update Firestore with customer ID
      await adminDb.collection('users').doc(userId).update({
        'subscription.stripeCustomerId': customer.id,
        'subscription.updatedAt': new Date().toISOString(),
      });
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Build subscription parameters
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

    // Apply coupon if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid !== false) {
          // Add coupon to subscription params using type assertion
          (subscriptionParams as any).coupon = couponCode;
          
          // Store coupon info in metadata
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
        // Continue without coupon if validation fails
      }
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Calculate discount amount if coupon was applied
    let discountInfo = null;
    if (couponCode && (subscription as any).discount) {
      const coupon = (subscription as any).discount.coupon;
      discountInfo = {
        couponCode: couponCode,
        percentOff: coupon.percent_off || null,
        amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
      };
    }

    // Update Firestore with subscription details
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

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
