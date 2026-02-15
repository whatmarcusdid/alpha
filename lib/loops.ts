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
  amount: string;
  receipt_number: string;
  invoice_number: string;
  payment_method: string;
  total_amount: string;
  paid_amount: string;
  invoiceUrl: string;
  receiptUrl: string;
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
    amount: data.amount,
    receipt_number: data.receipt_number,
    invoice_number: data.invoice_number,
    payment_method: data.payment_method,
    total_amount: data.total_amount,
    paid_amount: data.paid_amount,
    invoiceUrl: data.invoiceUrl,
    receiptUrl: data.receiptUrl,
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

/**
 * Sends the password reset email via Loops.
 * Uses LOOPS_PASSWORD_RESET_TEMPLATE_ID env var.
 * Template data variables: resetUrl, firstName (optional)
 */
export async function sendPasswordResetEmail(
  email: string,
  data: { resetUrl: string; firstName?: string }
): Promise<LoopsEmailResult> {
  const templateId = process.env.LOOPS_PASSWORD_RESET_TEMPLATE_ID;
  if (!templateId) {
    console.warn('[Loops] LOOPS_PASSWORD_RESET_TEMPLATE_ID not set - skipping password reset email');
    return { success: false, error: 'LOOPS_PASSWORD_RESET_TEMPLATE_ID not configured' };
  }
  return sendLoopsEmail(templateId, email, {
    resetUrl: data.resetUrl,
    firstName: data.firstName ?? '',
  });
}

/**
 * Sends the payment failed transactional email.
 * Uses LOOPS_PAYMENT_FAILED_TEMPLATE_ID env var.
 */
export async function sendPaymentFailedEmail(
  email: string,
  data: {
    total_amount: string;
    attempted_date: string;
    card_brand: string;
    card_last_4: string;
    plan_name: string;
    updatePaymentUrl: string;
  }
): Promise<LoopsEmailResult> {
  const templateId = process.env.LOOPS_PAYMENT_FAILED_TEMPLATE_ID;
  if (!templateId) {
    console.warn('[Loops] LOOPS_PAYMENT_FAILED_TEMPLATE_ID not set - skipping payment failed email');
    return { success: false, error: 'LOOPS_PAYMENT_FAILED_TEMPLATE_ID not configured' };
  }
  return sendLoopsEmail(templateId, email, data);
}

/**
 * Sends the plan change confirmation email.
 * Uses LOOPS_PLAN_CHANGE_TEMPLATE_ID env var.
 */
export async function sendPlanChangeEmail(
  email: string,
  data: {
    previous_plan_name: string;
    new_plan_name: string;
    effective_date: string;
    new_amount: string;
    billing_interval: string;
    new_support_hours: string;
    new_maintenance_hours: string;
    customerPortalUrl: string;
  }
): Promise<LoopsEmailResult> {
  const templateId = process.env.LOOPS_PLAN_CHANGE_TEMPLATE_ID;
  if (!templateId) {
    console.warn('[Loops] LOOPS_PLAN_CHANGE_TEMPLATE_ID not set - skipping plan change email');
    return { success: false, error: 'LOOPS_PLAN_CHANGE_TEMPLATE_ID not configured' };
  }
  return sendLoopsEmail(templateId, email, data);
}

/**
 * Sends the subscription canceled email.
 * Uses LOOPS_SUBSCRIPTION_CANCELED_TEMPLATE_ID env var.
 */
export async function sendSubscriptionCanceledEmail(
  email: string,
  data: {
    plan_name: string;
    cancellation_date: string;
    end_date: string;
  }
): Promise<LoopsEmailResult> {
  const templateId = process.env.LOOPS_SUBSCRIPTION_CANCELED_TEMPLATE_ID;
  if (!templateId) {
    console.warn('[Loops] LOOPS_SUBSCRIPTION_CANCELED_TEMPLATE_ID not set - skipping subscription canceled email');
    return { success: false, error: 'LOOPS_SUBSCRIPTION_CANCELED_TEMPLATE_ID not configured' };
  }
  return sendLoopsEmail(templateId, email, data);
}

/**
 * Sends the refund issued email.
 * Uses LOOPS_REFUND_ISSUED_TEMPLATE_ID env var.
 */
export async function sendRefundIssuedEmail(
  email: string,
  data: {
    refund_amount: string;
    refund_reason: string;
    original_charge_date: string;
    refund_date: string;
    card_brand: string;
    card_last_4: string;
  }
): Promise<LoopsEmailResult> {
  const templateId = process.env.LOOPS_REFUND_ISSUED_TEMPLATE_ID;
  if (!templateId) {
    console.warn('[Loops] LOOPS_REFUND_ISSUED_TEMPLATE_ID not set - skipping refund issued email');
    return { success: false, error: 'LOOPS_REFUND_ISSUED_TEMPLATE_ID not configured' };
  }
  return sendLoopsEmail(templateId, email, data);
}
