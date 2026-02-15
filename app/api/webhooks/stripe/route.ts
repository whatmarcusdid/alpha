import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import {
  sendPaymentConfirmedEmail,
  sendPaymentFailedEmail,
  sendPlanChangeEmail,
  sendSubscriptionCanceledEmail,
  sendRefundIssuedEmail,
} from '@/lib/loops';
import { updateLeadWithPayment } from '@/lib/notion-sales';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { getStripe, getStripeCustomerPortalUrl } from '@/lib/stripe-server';

// --- Growth Engine Helpers ---

function extractFirstName(customerName: string | null | undefined): string {
  if (!customerName || typeof customerName !== 'string') return 'Customer';
  const first = customerName.trim().split(/\s+/)[0];
  return first || 'Customer';
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

  const formattedAmount = formatCurrency(Math.round(data.amount * 100));
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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/** Builds payment confirmed email data from checkout session (fetches invoice/charge) */
async function buildPaymentConfirmedData(
  session: Stripe.Checkout.Session,
  normalizedEmail: string
): Promise<{
  amount: string;
  receipt_number: string;
  invoice_number: string;
  payment_method: string;
  total_amount: string;
  paid_amount: string;
  invoiceUrl: string;
  receiptUrl: string;
} | null> {
  const stripe = getStripe();
  const amountCents = session.amount_total || 0;
  const amountStr = formatCurrency(amountCents);

  let invoice: Stripe.Invoice | null = null;
  let charge: Stripe.Charge | null = null;
  let paymentMethod: Stripe.PaymentMethod | null = null;

  const subscriptionId = session.subscription as string | null;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice'],
    });
    const latestInvoiceId =
      typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : (subscription.latest_invoice as Stripe.Invoice)?.id;
    if (latestInvoiceId) {
      const inv = (await stripe.invoices.retrieve(latestInvoiceId, {
        expand: ['charge', 'payment_intent.payment_method'],
      })) as Stripe.Invoice & { charge?: Stripe.Charge; payment_intent?: Stripe.PaymentIntent };
      invoice = inv;
      charge = inv.charge || null;
      const pi = inv.payment_intent;
      paymentMethod = (pi?.payment_method as Stripe.PaymentMethod) || null;
    }
  } else if (session.invoice) {
    const inv = (await stripe.invoices.retrieve(session.invoice as string, {
      expand: ['charge', 'payment_intent.payment_method'],
    })) as Stripe.Invoice & { charge?: Stripe.Charge; payment_intent?: Stripe.PaymentIntent };
    invoice = inv;
    charge = inv.charge || null;
    const pi = inv.payment_intent;
    paymentMethod = (pi?.payment_method as Stripe.PaymentMethod) || null;
  }

  const cardBrand = paymentMethod?.card?.brand ?? 'card';
  const cardLast4 = paymentMethod?.card?.last4 ?? '****';
  const paymentMethodStr = `${cardBrand} ending in ${cardLast4}`;

  return {
    amount: amountStr,
    receipt_number: charge?.receipt_number ?? '',
    invoice_number: invoice?.number ?? '',
    payment_method: paymentMethodStr,
    total_amount: amountStr,
    paid_amount: amountStr,
    invoiceUrl: invoice?.hosted_invoice_url ?? '',
    receiptUrl: charge?.receipt_url ?? '',
  };
}

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

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripe = getStripe();

  try {
    const fullInvoice = (await stripe.invoices.retrieve(invoice.id, {
      expand: ['customer', 'subscription', 'default_payment_method'],
    })) as Stripe.Invoice & {
      customer?: Stripe.Customer | string | null;
      subscription?: Stripe.Subscription | string | null;
      default_payment_method?: Stripe.PaymentMethod | string | null;
    };

    const customer = fullInvoice.customer as Stripe.Customer | null;
    const customerEmail = customer?.email;
    if (!customerEmail) {
      console.error('[Loops] Invoice payment failed: no customer email for invoice', invoice.id);
      return;
    }

    const subscription = fullInvoice.subscription as Stripe.Subscription | null;
    const price = subscription?.items?.data?.[0]?.price;
    const product = price?.product;
    const planName =
      (product && typeof product === 'object' && 'name' in product ? product.name : null) ??
      (price?.lookup_key
        ? price.lookup_key.charAt(0).toUpperCase() + price.lookup_key.slice(1)
        : 'Subscription');

    let cardBrand = 'card';
    let cardLast4 = '****';
    const paymentMethod = fullInvoice.default_payment_method;
    if (paymentMethod && typeof paymentMethod === 'object') {
      const pm = paymentMethod as Stripe.PaymentMethod;
      if (pm.card) {
        cardBrand = pm.card.brand ?? 'card';
        cardLast4 = pm.card.last4 ?? '****';
      }
    }

    const customerId = typeof fullInvoice.customer === 'string' ? fullInvoice.customer : fullInvoice.customer?.id;
    if (!customerId) {
      console.error('[Loops] Invoice payment failed: no customer ID');
      return;
    }

    const updatePaymentUrl = await getStripeCustomerPortalUrl(customerId);

    const amountDue = invoice.amount_due ?? 0;
    const attemptedDate = formatDateTime(invoice.created);

    const emailResult = await sendPaymentFailedEmail(customerEmail, {
      total_amount: formatCurrency(amountDue),
      attempted_date: attemptedDate,
      card_brand: cardBrand,
      card_last_4: cardLast4,
      plan_name: planName,
      updatePaymentUrl,
    });

    if (emailResult.success) {
      console.log(`✅ [Loops] Payment failed email sent to: ${customerEmail}`);
    } else {
      console.error(`⚠️ [Loops] Failed to send payment failed email: ${emailResult.error}`);
    }
  } catch (err) {
    console.error('⚠️ [Loops] Payment failed email error:', err);
    Sentry.captureException(err, {
      tags: { webhook: 'true', stripe: 'true', event: 'invoice.payment_failed' },
    });
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = (event.data as { previous_attributes?: { items?: { data?: Array<{ price?: { product?: string } }> } } })
    .previous_attributes;

  if (!previousAttributes?.items?.data?.[0]?.price) return;

  const stripe = getStripe();
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (customer.deleted || !customer.email) return;

    const previousProductId = previousAttributes.items?.data?.[0]?.price?.product;
    let previousPlanName = 'Previous Plan';
    if (previousProductId && typeof previousProductId === 'string') {
      try {
        const prevProduct = await stripe.products.retrieve(previousProductId);
        previousPlanName = prevProduct.name ?? previousPlanName;
      } catch {
        // Keep default
      }
    }

    const newPrice = subscription.items.data[0].price;
    const productId = typeof newPrice.product === 'string' ? newPrice.product : newPrice.product?.id;
    const newProduct = productId ? await stripe.products.retrieve(productId) : null;
    const newPlanName = newProduct?.name ?? 'New Plan';

    const supportHours = newProduct?.metadata?.support_hours ?? '2 hours';
    const maintenanceHours = newProduct?.metadata?.maintenance_hours ?? '8 hours';

    const customerPortalUrl = await getStripeCustomerPortalUrl(subscription.customer as string);

    const emailResult = await sendPlanChangeEmail(customer.email, {
      previous_plan_name: previousPlanName,
      new_plan_name: newPlanName,
      effective_date: formatDate((subscription as any).current_period_start),
      new_amount: formatCurrency(newPrice.unit_amount || 0),
      billing_interval: newPrice.recurring?.interval ?? 'year',
      new_support_hours: supportHours,
      new_maintenance_hours: maintenanceHours,
      customerPortalUrl,
    });

    if (emailResult.success) {
      console.log(`✅ [Loops] Plan change email sent to: ${customer.email}`);
    } else {
      console.error(`⚠️ [Loops] Plan change email failed: ${emailResult.error}`);
    }
  } catch (err) {
    console.error('⚠️ [Loops] Plan change email error:', err);
    Sentry.captureException(err, {
      tags: { webhook: 'true', stripe: 'true', event: 'customer.subscription.updated' },
    });
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const stripe = getStripe();

  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (customer.deleted || !customer.email) return;

    const price = subscription.items.data[0]?.price;
    const productId = price && (typeof price.product === 'string' ? price.product : price.product?.id);
    const product = productId ? await stripe.products.retrieve(productId) : null;
    const planName = product?.name ?? 'Subscription';

    const emailResult = await sendSubscriptionCanceledEmail(customer.email, {
      plan_name: planName,
      cancellation_date: formatDate((subscription as any).canceled_at ?? Math.floor(Date.now() / 1000)),
      end_date: formatDate((subscription as any).current_period_end),
    });

    if (emailResult.success) {
      console.log(`✅ [Loops] Subscription canceled email sent to: ${customer.email}`);
    } else {
      console.error(`⚠️ [Loops] Subscription canceled email failed: ${emailResult.error}`);
    }
  } catch (err) {
    console.error('⚠️ [Loops] Subscription canceled email error:', err);
    Sentry.captureException(err, {
      tags: { webhook: 'true', stripe: 'true', event: 'customer.subscription.deleted' },
    });
  }
}

async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const refund = charge.refunds?.data?.[0];
  if (!refund) return;

  const stripe = getStripe();
  try {
    const customerId = charge.customer as string | null;
    if (!customerId) return;

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) return;

    const paymentMethod = charge.payment_method_details?.card;

    const emailResult = await sendRefundIssuedEmail(customer.email, {
      refund_amount: formatCurrency(refund.amount),
      refund_reason: refund.reason ?? 'Refund processed',
      original_charge_date: formatDate(charge.created),
      refund_date: formatDate(refund.created),
      card_brand: paymentMethod?.brand ?? 'Card',
      card_last_4: paymentMethod?.last4 ?? '****',
    });

    if (emailResult.success) {
      console.log(`✅ [Loops] Refund issued email sent to: ${customer.email}`);
    } else {
      console.error(`⚠️ [Loops] Refund issued email failed: ${emailResult.error}`);
    }
  } catch (err) {
    console.error('⚠️ [Loops] Refund issued email error:', err);
    Sentry.captureException(err, {
      tags: { webhook: 'true', stripe: 'true', event: 'charge.refunded' },
    });
  }
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
        event = getStripe().webhooks.constructEvent(body, sig!, webhookSecret);
        
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
          case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event);
            break;
          case 'customer.subscription.created':
            await handleSubscriptionEvent(event);
            break;
          case 'customer.subscription.updated':
            await handleSubscriptionEvent(event);
            await handleSubscriptionUpdated(event);
            break;
          case 'customer.subscription.deleted':
            await handleSubscriptionEvent(event);
            await handleSubscriptionDeleted(event);
            break;
          case 'charge.refunded':
            await handleChargeRefunded(event);
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
    const customer = await getStripe().customers.retrieve(customerId);
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
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
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
      const paymentData = await buildPaymentConfirmedData(session, normalizedEmail);
      const fallbackData = {
        amount: formatCurrency(session.amount_total || 0),
        receipt_number: '',
        invoice_number: '',
        payment_method: 'Card',
        total_amount: formatCurrency(session.amount_total || 0),
        paid_amount: formatCurrency(session.amount_total || 0),
        invoiceUrl: '',
        receiptUrl: '',
      };
      const emailResult = await sendPaymentConfirmedEmail(
        normalizedEmail,
        paymentData ?? fallbackData
      );

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

  const customer = await getStripe().customers.retrieve(customerId);
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
      const paymentData = await buildPaymentConfirmedData(session, normalizedEmail);
      const fallbackData = {
        amount: formatCurrency(session.amount_total || 0),
        receipt_number: '',
        invoice_number: '',
        payment_method: 'Card',
        total_amount: formatCurrency(session.amount_total || 0),
        paid_amount: formatCurrency(session.amount_total || 0),
        invoiceUrl: '',
        receiptUrl: '',
      };
      const emailResult = await sendPaymentConfirmedEmail(
        normalizedEmail,
        paymentData ?? fallbackData
      );

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
