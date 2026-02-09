import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Transaction interface matching TransactionsTable component
 */
interface Transaction {
  id: string;
  orderId: string;
  description: string;
  date: string;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  invoiceUrl?: string;
}

/**
 * Formats a Unix timestamp to MM-DD-YYYY
 * 
 * @param timestamp - Unix timestamp (seconds)
 * @returns Formatted date string
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

/**
 * Formats amount in cents to dollar string
 * 
 * @param amountCents - Amount in cents
 * @returns Formatted amount (e.g., "$249.00")
 */
function formatAmount(amountCents: number): string {
  const dollars = amountCents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Maps Stripe invoice status to Transaction status
 * 
 * @param stripeStatus - Stripe invoice status
 * @returns Transaction status
 */
function mapInvoiceStatus(stripeStatus: string): 'completed' | 'pending' | 'failed' {
  switch (stripeStatus) {
    case 'paid':
      return 'completed';
    case 'open':
    case 'draft':
      return 'pending';
    case 'void':
    case 'uncollectible':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * GET /api/stripe/get-invoices
 * 
 * Fetches the user's invoice history from Stripe
 * 
 * @returns Array of invoices formatted for TransactionsTable
 */
export const GET = withAuthAndRateLimit(
  async (req: NextRequest, { userId }: { userId: string }) => {
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: 'GET /api/stripe/get-invoices',
      },
      async (span) => {
        try {
          // Set span attribute for userId
          span.setAttribute('userId', userId);

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

          // If no Stripe customer ID, return empty array (user hasn't paid yet)
          if (!stripeCustomerId) {
            console.log(`No Stripe customer ID for user ${userId} - returning empty invoices`);
            return NextResponse.json({ invoices: [] });
          }

          // Set span attribute for customerId
          span.setAttribute('customerId', stripeCustomerId.substring(0, 10) + '...');

          // Fetch invoices from Stripe
          const invoices = await stripe.invoices.list({
            customer: stripeCustomerId,
            limit: 50,
            status: 'paid', // Only fetch paid invoices
          });

          // Get user's current payment method from Firestore for display
          const userPaymentMethod = userData?.paymentMethod;
          const defaultPaymentMethodDisplay = userPaymentMethod 
            ? `•••• ${userPaymentMethod.last4}` 
            : '•••• ****';

          // Map Stripe invoices to Transaction format
          const transactions: Transaction[] = invoices.data.map((invoice) => {
            // Get description from line items
            const description = invoice.lines.data[0]?.description || 'Genie Maintenance';
            
            // Format order ID
            const orderId = invoice.number ? `#TSG-${invoice.number}` : `#${invoice.id.substring(3, 12)}`;

            return {
              id: invoice.id,
              orderId,
              description,
              date: formatDate(invoice.created),
              amount: formatAmount(invoice.amount_paid),
              status: mapInvoiceStatus(invoice.status || 'paid'),
              paymentMethod: defaultPaymentMethodDisplay,
              invoiceUrl: invoice.hosted_invoice_url || undefined,
            };
          });

          console.log(`✅ Fetched ${transactions.length} invoices for user ${userId}`);

          // Capture success in Sentry
          Sentry.captureMessage('Invoices fetched successfully', {
            level: 'info',
            extra: {
              userId,
              customerId: stripeCustomerId.substring(0, 10) + '...',
              invoiceCount: transactions.length,
            },
          });

          return NextResponse.json({ invoices: transactions });
        } catch (error: any) {
          console.error('Error fetching invoices:', error);

          // Capture exception in Sentry
          Sentry.captureException(error, {
            tags: {
              endpoint: 'get-invoices',
              stripe: 'true',
            },
            extra: {
              userId,
            },
          });

          return NextResponse.json(
            { error: 'Failed to fetch invoices', details: error.message },
            { status: 500 }
          );
        }
      }
    );
  },
  generalLimiter // 60 requests per minute per IP (read operations)
);
