import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { sendPaymentConfirmedEmail } from '@/lib/loops';
import { updateLeadWithPayment } from '@/lib/notion-sales';

// --- Growth Engine Helpers ---

function extractFirstName(customerName: string | null | undefined): string {
  if (!customerName || typeof customerName !== 'string') return 'Customer';
  const first = customerName.trim().split(/\s+/)[0];
  return first || 'Customer';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

async function sendPaymentSlackNotification(data: {
  email: string;
  businessName: string;
  tier: string;
  billingCycle: string;
  amount: number;
  notionUrl?: string;
  stripeCustomerId: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ [Slack] SLACK_WEBHOOK_URL not configured, skipping');
    return;
  }

  const formattedAmount = formatCurrency(data.amount);
  const notionLink = data.notionUrl
    ? `\n*Notion:* <${data.notionUrl}|View lead>`
    : '';

  const message = `💳 *Payment Received*

*Email:* ${data.email}
*Business:* ${data.businessName}
*Plan:* ${data.tier} (${data.billingCycle}) - ${formattedAmount}
*Stripe Customer ID:* \`${data.stripeCustomerId}\`${notionLink}`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    throw new Error(`Slack HTTP ${response.status}: ${await response.text()}`);
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleSubscriptionEvent(event: Stripe.Event) {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized - skipping database update');
    return;
  }
  
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  const userRef = adminDb.collection('users').where('stripeCustomerId', '==', customerId).limit(1);
  const userSnapshot = await userRef.get();

  if (userSnapshot.empty) {
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  const userId = userSnapshot.docs[0].id;
  const userDocRef = adminDb.collection('users').doc(userId);

  // Extract coupon information if discount is applied
  let discountInfo = null;
  if ((subscription as any).discount && (subscription as any).discount.coupon) {
    const coupon = (subscription as any).discount.coupon;
    discountInfo = {
      couponCode: coupon.id,
      percentOff: coupon.percent_off || null,
      amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months || null,
    };
  }

  const subscriptionData: any = {
    subscription: {
      status: subscription.status,
      tier: subscription.items.data[0]?.price.lookup_key,
      startDate: admin.firestore.Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
      endDate: admin.firestore.Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000)),
      stripeSubscriptionId: subscription.id,
      updatedAt: admin.firestore.Timestamp.now(),
    }
  };

  // Add discount info if available
  if (discountInfo) {
    subscriptionData.subscription.couponApplied = discountInfo.couponCode;
    subscriptionData.subscription.discount = discountInfo;
  }

  await userDocRef.set(subscriptionData, { merge: true });
}

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'webhook.stripe',
      name: 'Process Stripe Webhook',
    },
    async (span) => {
      const headersList = await headers();
      const sig = headersList.get('stripe-signature');
      let event: Stripe.Event;

      try {
        const body = await req.text();
        event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
        
        // Set span attribute for event type
        span.setAttribute('eventType', event.type);
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event, span);
            break;
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted':
            await handleSubscriptionEvent(event);
            break;
          // Add other event types to handle as needed
          default:
            console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
      } catch (error: any) {
        console.error('Error handling webhook event:', error);
        
        // Capture webhook processing error in Sentry
        Sentry.captureException(error, {
          tags: {
            webhook: 'true',
            stripe: 'true',
          },
        });
        
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
      }
    }
  );
}

async function handleCheckoutSessionCompleted(event: Stripe.Event, span: any) {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized - skipping database update');
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = session.customer as string;
  
  // Set span attribute with truncated customerId for privacy
  if (customerId) {
    span.setAttribute('customerId', customerId.substring(0, 10) + '...');
  }

  // Find user by Stripe customer ID
  const userRef = adminDb.collection('users').where('stripeCustomerId', '==', customerId).limit(1);
  const userSnapshot = await userRef.get();

  if (userSnapshot.empty) {
    // No user found - this is expected for "pay first, signup later" flow
    // Store in pending_subscriptions collection for later linking
    
    // Get customer email from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = (customer as Stripe.Customer).email;
    
    if (!customerEmail) {
      Sentry.captureMessage('Webhook: No email found for customer', {
        level: 'error',
        extra: { customerId, sessionId: session.id },
      });
      console.error(`No email found for Stripe customer: ${customerId}`);
      return;
    }
    
    // Normalize email (lowercase, trimmed)
    const normalizedEmail = customerEmail.toLowerCase().trim();
    
    // Get subscription details
    const subscriptionId = session.subscription as string;
    let subscriptionData = null;
    
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        priceId: subscription.items.data[0]?.price.id,
      };
    }
    
    // Store in pending_subscriptions collection
    const pendingRef = adminDb.collection('pending_subscriptions').doc(normalizedEmail);
    await pendingRef.set({
      email: normalizedEmail,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeSessionId: session.id,
      tier: session.metadata?.tier || 'essential',
      billingCycle: session.metadata?.billingCycle || 'annual',
      amount: session.amount_total ? session.amount_total / 100 : 0,
      subscription: subscriptionData,
      createdAt: admin.firestore.Timestamp.now(),
      status: 'pending', // Will be 'claimed' after user signs up
    });
    
    console.log(`✅ Stored pending subscription for email: ${normalizedEmail}`);

    // ========================================
    // GROWTH ENGINE: Post-Payment Automations
    // ========================================

    const customerName = (customer as Stripe.Customer).name;
    const firstName = extractFirstName(customerName);
    const tier = session.metadata?.tier || 'essential';
    const billingCycle = session.metadata?.billingCycle || 'annual';
    const amount = session.amount_total ? session.amount_total / 100 : 0;

    const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1);
    const displayBillingCycle = billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1);

    // 1. Send Payment Confirmed email via Loops (non-blocking)
    try {
      const emailResult = await sendPaymentConfirmedEmail(normalizedEmail, {
        firstName,
        planTier: displayTier,
        amountPaid: formatCurrency(amount),
        billingCycle: displayBillingCycle,
      });

      if (emailResult.success) {
        console.log(`✅ [Loops] Payment confirmed email sent to: ${normalizedEmail}`);
      } else {
        console.error(`⚠️ [Loops] Failed to send email: ${emailResult.error}`);
      }
    } catch (emailError) {
      console.error('⚠️ [Loops] Email error (non-blocking):', emailError);
    }

    // 2. Update Notion lead status (non-blocking)
    let notionResult: { success: boolean; found: boolean; businessName?: string; pageUrl?: string; error?: string } = {
      success: false,
      found: false,
      businessName: 'Unknown Business',
      pageUrl: undefined,
    };
    try {
      notionResult = await updateLeadWithPayment({
        email: normalizedEmail,
        status: 'Won - Awaiting Signup',
        paymentAmount: amount,
        paymentDate: new Date().toISOString(),
        subscriptionTier: displayTier,
        billingCycle: displayBillingCycle,
        stripeCustomerId: customerId,
      });

      if (notionResult.success) {
        console.log(`✅ [Notion] Updated lead: ${notionResult.businessName}`);
      } else if (!notionResult.found) {
        console.log(`ℹ️ [Notion] Lead not found for: ${normalizedEmail} (direct purchase)`);
      } else {
        console.error(`⚠️ [Notion] Update failed: ${notionResult.error}`);
      }
    } catch (notionError) {
      console.error('⚠️ [Notion] Error (non-blocking):', notionError);
    }

    // 3. Send Slack notification (non-blocking)
    try {
      await sendPaymentSlackNotification({
        email: normalizedEmail,
        businessName: notionResult.businessName || 'Unknown Business',
        tier: displayTier,
        billingCycle: displayBillingCycle,
        amount,
        notionUrl: notionResult.pageUrl,
        stripeCustomerId: customerId,
      });
      console.log(`✅ [Slack] Payment notification sent`);
    } catch (slackError) {
      console.error('⚠️ [Slack] Notification error (non-blocking):', slackError);
    }

    // ========================================
    // END: Growth Engine Automations
    // ========================================

    Sentry.captureMessage('Webhook: Stored pending subscription', {
      level: 'info',
      extra: { email: normalizedEmail, customerId, subscriptionId },
    });

    return;
  }

  const userId = userSnapshot.docs[0].id;
  const userDocRef = adminDb.collection('users').doc(userId);

  // Update user subscription status
  const subscriptionId = session.subscription as string;
  const tier = session.metadata?.tier || 'essential';
  const billingCycle = session.metadata?.billingCycle || 'annual';

  await userDocRef.set({
    subscription: {
      status: 'active',
      tier,
      billingCycle,
      stripeSubscriptionId: subscriptionId,
      activatedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  }, { merge: true });

  // ========================================
  // GROWTH ENGINE: Post-Payment Automations
  // ========================================

  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;
  const normalizedEmail = customerEmail ? customerEmail.toLowerCase().trim() : '';

  if (normalizedEmail) {
    const customerName = (customer as Stripe.Customer).name;
    const firstName = extractFirstName(customerName);
    const amount = session.amount_total ? session.amount_total / 100 : 0;

    const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1);
    const displayBillingCycle = billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1);

    // 1. Send Payment Confirmed email via Loops (non-blocking)
    try {
      const emailResult = await sendPaymentConfirmedEmail(normalizedEmail, {
        firstName,
        planTier: displayTier,
        amountPaid: formatCurrency(amount),
        billingCycle: displayBillingCycle,
      });

      if (emailResult.success) {
        console.log(`✅ [Loops] Payment confirmed email sent to: ${normalizedEmail}`);
      } else {
        console.error(`⚠️ [Loops] Failed to send email: ${emailResult.error}`);
      }
    } catch (emailError) {
      console.error('⚠️ [Loops] Email error (non-blocking):', emailError);
    }

    // 2. Update Notion lead status (non-blocking)
    let notionResult: { success: boolean; found: boolean; businessName?: string; pageUrl?: string; error?: string } = {
      success: false,
      found: false,
      businessName: 'Unknown Business',
      pageUrl: undefined,
    };
    try {
      notionResult = await updateLeadWithPayment({
        email: normalizedEmail,
        status: 'Won - Awaiting Signup',
        paymentAmount: amount,
        paymentDate: new Date().toISOString(),
        subscriptionTier: displayTier,
        billingCycle: displayBillingCycle,
        stripeCustomerId: customerId,
      });

      if (notionResult.success) {
        console.log(`✅ [Notion] Updated lead: ${notionResult.businessName}`);
      } else if (!notionResult.found) {
        console.log(`ℹ️ [Notion] Lead not found for: ${normalizedEmail} (direct purchase)`);
      } else {
        console.error(`⚠️ [Notion] Update failed: ${notionResult.error}`);
      }
    } catch (notionError) {
      console.error('⚠️ [Notion] Error (non-blocking):', notionError);
    }

    // 3. Send Slack notification (non-blocking)
    try {
      await sendPaymentSlackNotification({
        email: normalizedEmail,
        businessName: notionResult.businessName || 'Unknown Business',
        tier: displayTier,
        billingCycle: displayBillingCycle,
        amount,
        notionUrl: notionResult.pageUrl,
        stripeCustomerId: customerId,
      });
      console.log(`✅ [Slack] Payment notification sent`);
    } catch (slackError) {
      console.error('⚠️ [Slack] Notification error (non-blocking):', slackError);
    }
  }

  // ========================================
  // END: Growth Engine Automations
  // ========================================

  // Success: Subscription activated
  Sentry.captureMessage('Subscription activated via webhook', {
    level: 'info',
    extra: {
      userId,
      customerId: customerId?.substring(0, 10) + '...',
    },
  });

  console.log(`Subscription activated for user ${userId}`);
}
