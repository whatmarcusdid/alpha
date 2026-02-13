/**
 * Slack notification helpers for TradeSiteGenie
 *
 * Provides functions for posting to different Slack channels via Incoming Webhooks.
 * Each channel has its own webhook URL (SLACK_WEBHOOK_URL, SLACK_SUPPORT_WEBHOOK_URL, SLACK_SALES_WEBHOOK_URL).
 */

// --- Types ---

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string }>;
  [key: string]: unknown;
}

export interface SlackWebhookPayload {
  text?: string; // Fallback for notifications
  blocks?: SlackBlock[];
  attachments?: Array<{ color?: string; blocks?: SlackBlock[] }>;
}

// --- Generic Sales Channel Helper ---

/**
 * Sends a message to the TSG Sales Slack channel (#tsg-sales).
 * Uses SLACK_SALES_WEBHOOK_URL environment variable.
 *
 * @param payload - Slack webhook payload (blocks, text, or attachments)
 * @returns true if sent successfully, false if webhook not configured or send failed
 */
export async function sendSlackSalesNotification(
  payload: SlackWebhookPayload
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_SALES_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Slack] SLACK_SALES_WEBHOOK_URL not configured, skipping');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('[Slack] Sales webhook error:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Slack] Sales notification error:', error);
    return false;
  }
}

// --- Booking Notification ---

export interface BookingCompletedData {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  tradeType: string;
  numEmployees: string;
  biggestFrustration: string;
}

/**
 * Sends a notification to #tsg-sales when a Website Game Plan booking is completed.
 * Uses Slack Block Kit for rich formatting with contact info, business details, and pain point.
 *
 * @param data - Booking intake form data from the completed flow
 */
export async function sendBookingCompletedNotification(
  data: BookingCompletedData
): Promise<void> {
  const displayUrl = data.websiteUrl.startsWith('http')
    ? data.websiteUrl
    : `https://${data.websiteUrl}`;

  const payload: SlackWebhookPayload = {
    text: `🎯 New Website Game Plan Booking: ${data.businessName} - ${data.email}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎯 New Website Game Plan Booking!',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Contact*\n• *Name:* ${data.firstName} ${data.lastName}\n• *Email:* ${data.email}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Business*\n• *Company:* ${data.businessName}\n• *Website:* <${displayUrl}|${displayUrl}>\n• *Trade Type:* ${data.tradeType}\n• *Employees:* ${data.numEmployees}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Pain Point (Sales Intel)*\n>${data.biggestFrustration}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Submitted ${new Date().toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'America/New_York',
            })} ET`,
          },
        ],
      },
    ],
  };

  const sent = await sendSlackSalesNotification(payload);
  if (sent) {
    console.log('[Slack] Booking notification sent to #tsg-sales:', data.email);
  }
}
