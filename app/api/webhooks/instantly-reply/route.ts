/**
 * Instantly.ai Reply Webhook Handler
 *
 * Receives reply_received events from Instantly.ai when leads reply to outreach emails.
 * Logs full payload structure during initial setup to discover exact field names.
 * No authentication yet - will add signature verification once we see what headers Instantly sends.
 */

import { NextResponse } from 'next/server';

interface InstantlyWebhookPayload {
  timestamp?: string;
  event_type?: string;
  campaign_name?: string;
  workspace?: string;
  campaign_id?: string;
  lead_email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  website?: string;
  phone?: string;
  step?: number;
  email_account?: string;
  // Catch-all for unknown fields (especially reply text)
  [key: string]: unknown;
}

// In-memory duplicate detection - same lead_email within 5 minutes = ignore
const recentWebhooks = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function cleanOldEntries(): void {
  const now = Date.now();
  for (const [email, timestamp] of recentWebhooks.entries()) {
    if (now - timestamp > DUPLICATE_WINDOW_MS) {
      recentWebhooks.delete(email);
    }
  }
}

export async function POST(request: Request) {
  // Always return 200 to prevent Instantly.ai retries - never throw
  try {
    // Parse JSON body
    let payload: InstantlyWebhookPayload;
    try {
      const bodyText = await request.text();
      payload = JSON.parse(bodyText) as InstantlyWebhookPayload;
    } catch (error) {
      console.error('[Instantly Webhook] JSON parse error:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 });
    }

    // Build headers object for logging (Request.headers is a Headers object)
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    // Log EVERYTHING so we can see exact payload structure
    console.log('[Instantly Webhook] ====== NEW WEBHOOK RECEIVED ======');
    console.log('[Instantly Webhook] Timestamp:', new Date().toISOString());
    console.log('[Instantly Webhook] Headers:', JSON.stringify(headersObj, null, 2));
    console.log('[Instantly Webhook] Payload:', JSON.stringify(payload, null, 2));
    console.log('[Instantly Webhook] ================================');

    // Check event_type - warn if different but still process
    if (payload.event_type && payload.event_type !== 'reply_received') {
      console.warn('[Instantly Webhook] Unexpected event_type:', payload.event_type, '- expected reply_received');
    }

    // Validate lead_email - log error if missing, still return 200
    if (!payload.lead_email || typeof payload.lead_email !== 'string') {
      console.error('[Instantly Webhook] Missing or invalid lead_email in payload');
      return NextResponse.json({ warning: 'Missing lead_email' }, { status: 200 });
    }

    const leadEmail = payload.lead_email.toLowerCase().trim();

    // Clean old entries from duplicate cache
    cleanOldEntries();

    // Check for duplicate - same lead_email within 5 minutes
    const lastSeen = recentWebhooks.get(leadEmail);
    if (lastSeen && Date.now() - lastSeen < DUPLICATE_WINDOW_MS) {
      console.log('[Instantly Webhook] Duplicate ignored (same lead_email within 5 min):', leadEmail);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Add to duplicate cache
    recentWebhooks.set(leadEmail, Date.now());

    // Log summary
    const companyName = payload.companyName ?? 'Unknown';
    const campaignName = payload.campaign_name ?? 'Unknown';
    console.log(
      `[Instantly Webhook] Summary: Reply from ${leadEmail} (${companyName}) - Campaign: ${campaignName}`
    );

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Never throw - always return 200 to prevent retries
    console.error('[Instantly Webhook] Unexpected error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
