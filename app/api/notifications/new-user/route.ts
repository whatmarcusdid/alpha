/**
 * New User Notification API Endpoint
 * 
 * WHAT THIS DOES:
 * Sends a Slack notification when a new user signs up for TradeSiteGenie.
 * 
 * AUTHENTICATION:
 * No authentication required - this is an internal API called from SignUpForm.
 * 
 * SECURITY:
 * - Validates all input fields before processing
 * - Doesn't expose internal webhook URLs in error messages
 * - Logs errors server-side without exposing details to client
 * 
 * INTEGRATION:
 * Called from SignUpForm.tsx after successful user creation to notify the team.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Request body for new user notification
 */
interface NotificationRequest {
  userId: string;
  email: string;
  displayName: string;
  tier: 'essential' | 'advanced' | 'premium';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
}

/**
 * Slack webhook payload
 */
interface SlackWebhookPayload {
  text: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates the request body has all required fields
 * 
 * @param body - Request body to validate
 * @returns Error message if validation fails, null if valid
 */
function validateRequestBody(body: any): string | null {
  // Check body is an object
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object';
  }

  // Check required fields
  const requiredFields = [
    'userId',
    'email',
    'displayName',
    'tier',
    'billingCycle',
    'amount',
  ];

  for (const field of requiredFields) {
    // Special handling for 'amount' - allow 0 as valid value
    if (field === 'amount') {
      if (body[field] === undefined || body[field] === null) {
        return `Missing required field: ${field}`;
      }
    } else {
      if (!body[field]) {
        return `Missing required field: ${field}`;
      }
    }
  }

  // Validate tier
  const validTiers = ['essential', 'advanced', 'premium'];
  if (!validTiers.includes(body.tier)) {
    return `Invalid tier: ${body.tier}. Must be one of: ${validTiers.join(', ')}`;
  }

  // Validate billing cycle
  const validBillingCycles = ['monthly', 'yearly'];
  if (!validBillingCycles.includes(body.billingCycle)) {
    return `Invalid billingCycle: ${body.billingCycle}. Must be one of: ${validBillingCycles.join(', ')}`;
  }

  // Validate amount is a non-negative number (allow 0 for free/default signups)
  if (typeof body.amount !== 'number' || body.amount < 0) {
    return 'Amount must be a non-negative number';
  }

  return null;
}

/**
 * Capitalizes the first letter of a string
 * 
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats timestamp for display in Slack message
 * 
 * @returns Formatted timestamp string (e.g., "Feb 9, 2026 at 2:45 PM EST")
 */
function formatTimestamp(): string {
  const now = new Date();
  
  // Format: "Feb 9, 2026 at 2:45 PM EST"
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  
  const datePart = now.toLocaleDateString('en-US', dateOptions);
  const timePart = now.toLocaleTimeString('en-US', timeOptions);
  
  return `${datePart} at ${timePart}`;
}

/**
 * Formats the Slack message with customer signup details
 * 
 * @param data - Notification request data
 * @returns Formatted Slack message
 */
function formatSlackMessage(data: NotificationRequest): string {
  const tierName = capitalize(data.tier);
  const billingCycleName = capitalize(data.billingCycle);
  const formattedAmount = data.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  });
  const timestamp = formatTimestamp();

  // Build the Slack message
  const message = `🎉 *New Customer Signup*

*Customer:* ${data.displayName}
*Email:* ${data.email}
*Plan:* ${tierName} - ${billingCycleName} (${formattedAmount})
*Signed up:* ${timestamp}
*User ID:* \`${data.userId}\`

New customer - ${data.email}, ${data.displayName}, Company Name TBD, signed up for ${tierName} plan`;

  return message;
}

/**
 * Sends notification to Slack webhook
 * 
 * @param webhookUrl - Slack webhook URL
 * @param message - Formatted message to send
 * @returns True if successful, false otherwise
 */
async function sendSlackNotification(
  webhookUrl: string,
  message: string
): Promise<boolean> {
  try {
    const payload: SlackWebhookPayload = {
      text: message,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Slack webhook returned error:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return false;
  }
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/notifications/new-user
 * 
 * Sends a Slack notification for a new user signup
 * 
 * @param request - Next.js request object
 * @returns JSON response with success/error status
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // STEP 1: Parse Request Body
    // ========================================================================
    let body: any;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 2: Validate Request Body
    // ========================================================================
    const validationError = validateRequestBody(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const data = body as NotificationRequest;

    // ========================================================================
    // STEP 3: Check Slack Webhook URL
    // ========================================================================
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('❌ SLACK_WEBHOOK_URL environment variable not configured');
      return NextResponse.json(
        { success: false, error: 'Notification service not configured' },
        { status: 500 }
      );
    }

    // ========================================================================
    // STEP 4: Format and Send Slack Message
    // ========================================================================
    const message = formatSlackMessage(data);
    const success = await sendSlackNotification(webhookUrl, message);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send notification' },
        { status: 500 }
      );
    }

    // ========================================================================
    // STEP 5: Return Success Response
    // ========================================================================
    console.log('✅ Slack notification sent successfully:', {
      email: data.email,
      tier: data.tier,
      billingCycle: data.billingCycle,
    });

    return NextResponse.json(
      { success: true, message: 'Notification sent' },
      { status: 200 }
    );

  } catch (error) {
    // Catch-all error handler
    console.error('❌ Unexpected error in new-user notification:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/new-user
 * 
 * Returns 405 Method Not Allowed - only POST is supported
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}
