import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the function
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const { sessionId } = await request.json();

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          success: false,
          error: 'Session ID is required' 
        },
        { status: 400 }
      );
    }

    try {
      // Retrieve the Checkout Session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

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

      // Extract session details
      const customerEmail = session.customer_details?.email || null;
      const amountTotal = session.amount_total || 0;
      const currency = session.currency || 'usd';
      const paymentStatus = session.payment_status || 'unpaid';
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

      throw stripeError;
    }

  } catch (error) {
    console.error('Error retrieving session details:', error);
    return NextResponse.json<ErrorResponse>(
      { 
        success: false,
        error: 'Failed to retrieve session details. Please try again.' 
      },
      { status: 500 }
    );
  }
}

