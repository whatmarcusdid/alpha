import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, attachPaymentMethodSchema } from '@/lib/validation';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/stripe/attach-payment-method
 * 
 * Attaches a payment method to a Stripe customer and sets it as default.
 * Also stores the card details in Firestore for display purposes.
 * 
 * @param paymentMethodId - The Stripe payment method ID to attach
 * @returns Success with card brand and last4, or error
 */
export const POST = withAuthAndRateLimit(
  async (req: NextRequest, { userId }: { userId: string }) => {
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: 'POST /api/stripe/attach-payment-method',
      },
      async (span) => {
        try {
          // Set span attribute for userId
          span.setAttribute('userId', userId);

          // Validate request body
          const validation = await validateRequestBody(req, attachPaymentMethodSchema);
          if (!validation.success) {
            return validation.error;
          }

          const { paymentMethodId } = validation.data;

          // Check if Firebase Admin is initialized
          if (!adminDb) {
            console.error('Firebase Admin not initialized');
            return NextResponse.json(
              { error: 'Server configuration error' },
              { status: 500 }
            );
          }

          // Get user document from Firestore
          const userDoc = await adminDb.collection('users').doc(userId).get();

          if (!userDoc.exists) {
            return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            );
          }

          const userData = userDoc.data();
          const stripeCustomerId = userData?.subscription?.stripeCustomerId || userData?.stripeCustomerId;

          if (!stripeCustomerId) {
            // Capture warning in Sentry
            Sentry.captureMessage('Attach payment method: No Stripe customer ID found', {
              level: 'warning',
              extra: { userId },
            });

            return NextResponse.json(
              { error: 'No Stripe customer found for this user' },
              { status: 400 }
            );
          }

          // Set span attribute for customerId
          span.setAttribute('customerId', stripeCustomerId.substring(0, 10) + '...');

          // Attach payment method to customer
          try {
            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: stripeCustomerId,
            });
          } catch (error: any) {
            console.error('Error attaching payment method:', error);

            // Handle Stripe card errors specifically
            if (error.type === 'StripeCardError' || error.code?.includes('card')) {
              return NextResponse.json(
                { error: error.message || 'Card error occurred' },
                { status: 400 }
              );
            }

            throw error; // Re-throw to be caught by outer catch
          }

          // Set as default payment method
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });

          // Retrieve payment method details
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

          // Extract card details
          const cardBrand = paymentMethod.card?.brand || 'unknown';
          const cardLast4 = paymentMethod.card?.last4 || '****';
          const expMonth = paymentMethod.card?.exp_month || 0;
          const expYear = paymentMethod.card?.exp_year || 0;

          // Store payment method info in Firestore
          await adminDb.collection('users').doc(userId).update({
            paymentMethod: {
              brand: cardBrand,
              last4: cardLast4,
              expMonth,
              expYear,
              paymentMethodId,
              updatedAt: admin.firestore.Timestamp.now(),
            },
          });

          console.log(`✅ Payment method attached successfully for user ${userId}`);

          // Capture success in Sentry
          Sentry.captureMessage('Payment method attached successfully', {
            level: 'info',
            extra: {
              userId,
              customerId: stripeCustomerId.substring(0, 10) + '...',
              cardBrand,
              cardLast4,
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Payment method attached successfully',
            card: {
              brand: cardBrand,
              last4: cardLast4,
            },
          });
        } catch (error: any) {
          console.error('Error in attach-payment-method:', error);

          // Capture exception in Sentry
          Sentry.captureException(error, {
            tags: {
              endpoint: 'attach-payment-method',
              stripe: 'true',
            },
            extra: {
              userId,
            },
          });

          return NextResponse.json(
            { error: 'Failed to attach payment method', details: error.message },
            { status: 500 }
          );
        }
      }
    );
  },
  checkoutLimiter // 10 requests per minute per IP
);
