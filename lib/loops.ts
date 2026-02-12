/**
 * Loops transactional email helper for TradeSiteGenie
 *
 * Sends transactional emails via Loops API.
 * Server-side only - no browser checks needed.
 */

const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';

// Template IDs
const PAYMENT_CONFIRMED_TEMPLATE_ID = 'cmljywb8500kh0i05bqou9jfz';
const DASHBOARD_READY_TEMPLATE_ID = 'cmljz00aj00po0i1otsvlemng';

// --- Types ---

export interface LoopsEmailResult {
  success: boolean;
  error?: string;
}

export interface PaymentConfirmedData {
  firstName: string;
  planTier: string; // "Essential", "Advanced", "Premium"
  amountPaid: string; // "$539.00" (pre-formatted)
  billingCycle: string; // "Annual", "Quarterly", "Monthly"
}

export interface DashboardReadyData {
  firstName: string;
  planTier: string;
}

// --- Internal helper ---

async function sendLoopsEmail(
  templateId: string,
  email: string,
  dataVariables: Record<string, string>
): Promise<LoopsEmailResult> {
  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set - skipping email send');
    return { success: false, error: 'LOOPS_API_KEY not configured' };
  }

  try {
    const response = await fetch(LOOPS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionalId: templateId,
        email,
        dataVariables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Loops] API error:', response.status, errorText);
      return { success: false, error: errorText };
    }

    console.log('[Loops] Email sent successfully:', email, templateId);
    return { success: true };
  } catch (error) {
    console.error('[Loops] Network error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// --- Exported functions ---

/**
 * Sends the payment confirmed transactional email.
 */
export async function sendPaymentConfirmedEmail(
  email: string,
  data: PaymentConfirmedData
): Promise<LoopsEmailResult> {
  return sendLoopsEmail(PAYMENT_CONFIRMED_TEMPLATE_ID, email, {
    firstName: data.firstName,
    planTier: data.planTier,
    amountPaid: data.amountPaid,
    billingCycle: data.billingCycle,
  });
}

/**
 * Sends the dashboard ready transactional email.
 */
export async function sendDashboardReadyEmail(
  email: string,
  data: DashboardReadyData
): Promise<LoopsEmailResult> {
  return sendLoopsEmail(DASHBOARD_READY_TEMPLATE_ID, email, {
    firstName: data.firstName,
    planTier: data.planTier,
  });
}
