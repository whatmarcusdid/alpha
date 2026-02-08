import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, getSessionDetailsSchema } from '@/lib/validation';

// Type definitions for response
type SuccessResponse = {
  success: true;
  customerId: string;
  customerEmail: string | null;
  subscriptionId: string;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  tier: string;
  billingCycle: string;
};

type ErrorResponse = {
  success: false;
  error: string;
};

type ApiResponse = SuccessResponse | ErrorResponse;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: 'GET /api/stripe/get-session-details',
      },
      async (span) => {
        try {
          // Validate request body
          const validation = await validateRequestBody(req, getSessionDetailsSchema);
          if (!validation.success) {
            return validation.error;
          }

          const { sessionId } = validation.data;

          // Capture warning if sessionId is missing (shouldn't happen due to validation, but defensive)
          if (!sessionId) {
            Sentry.captureMessage('Session ID missing in get-session-details request', {
              level: 'warning',
            });
            return NextResponse.json<ErrorResponse>({
              success: false,
              error: 'Session ID is required'
            }, { status: 400 });
          }

          // Set span attribute with truncated sessionId for privacy
          span.setAttribute('sessionId', sessionId.substring(0, 10) + '...');

          try {
            // Retrieve the Checkout Session from Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId, {
              expand: ['subscription', 'customer'],
            });

            // Extract session details
            const paymentStatus = session.payment_status || 'unpaid';
            const amountTotal = session.amount_total || 0;

            // Set span attributes for monitoring
            span.setAttribute('paymentStatus', paymentStatus);
            span.setAttribute('amount', amountTotal);

            // Capture warning if payment status is not 'paid'
            if (paymentStatus !== 'paid') {
              Sentry.captureMessage('Session retrieved with non-paid status', {
                level: 'warning',
                extra: {
                  sessionId: sessionId.substring(0, 10) + '...',
                  status: paymentStatus,
                },
              });
            }

            // Extract customer ID
            const customerId = typeof session.customer === 'string' 
              ? session.customer 
              : session.customer?.id;

            if (!customerId) {
              return NextResponse.json<ErrorResponse>({
                success: false,
                error: 'No customer associated with this session'
              }, { status: 404 });
            }

            // Extract subscription ID
            const subscriptionId = typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;

            if (!subscriptionId) {
              return NextResponse.json<ErrorResponse>({
                success: false,
                error: 'No subscription associated with this session'
              }, { status: 404 });
            }

            // Extract remaining session details
            const customerEmail = session.customer_details?.email || null;
            const currency = session.currency || 'usd';
            const tier = session.metadata?.tier || 'essential';
            const billingCycle = session.metadata?.billingCycle || 'annual';

            // Return successful response
            return NextResponse.json<SuccessResponse>({
              success: true,
              customerId,
              customerEmail,
              subscriptionId,
              amountTotal,
              currency,
              paymentStatus,
              tier,
              billingCycle,
            });

          } catch (stripeError: any) {
            // Handle Stripe-specific errors
            if (stripeError.type === 'StripeInvalidRequestError') {
              return NextResponse.json<ErrorResponse>(
                {
                  success: false,
                  error: 'Invalid or not found Checkout Session'
                },
                { status: 404 }
              );
            }

            // Log the error for debugging
            console.error('Stripe API error:', stripeError);

            // Capture Stripe error in Sentry
            Sentry.captureException(stripeError, {
              tags: {
                endpoint: 'get-session-details',
                stripe: 'true',
              },
              extra: {
                sessionId: sessionId.substring(0, 10) + '...',
                method: 'POST',
              },
            });

            throw stripeError;
          }

        } catch (error) {
          console.error('Error retrieving session details:', error);
          
          // Capture general error in Sentry
          Sentry.captureException(error, {
            tags: {
              endpoint: 'get-session-details',
              stripe: 'true',
            },
            extra: {
              method: 'POST',
            },
          });

          return NextResponse.json<ErrorResponse>(
            { 
              success: false,
              error: 'Failed to retrieve session details. Please try again.' 
            },
            { status: 500 }
          );
        }
      }
    );
  },
  generalLimiter // 60 requests per minute per IP
);
