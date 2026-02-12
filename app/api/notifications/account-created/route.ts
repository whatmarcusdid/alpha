/**
 * Account Created Notification API
 *
 * Sends the "Account Created" Slack notification after signup.
 * Also updates Notion lead status to "Closed Won" to complete the pipeline.
 * Called from SignUpForm after successful account creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findLeadByEmail, updateLeadStatus } from '@/lib/notion-sales';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, displayName, tier, billingCycle } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('[Account Created] SLACK_WEBHOOK_URL not configured');
      return NextResponse.json({ success: true, warning: 'Slack not configured' });
    }

    console.log(`[Account Created] Processing for: ${email}`);

    // Format tier and billing cycle for display
    const displayTier = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Essential';
    const displayBillingCycle = billingCycle
      ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
      : 'Annual';

    // Try to get Notion URL for the lead (optional enhancement for Slack message)
    let notionUrl: string | undefined;
    try {
      const notionResult = await findLeadByEmail(email.toLowerCase().trim());
      if (notionResult.found && notionResult.pageUrl) {
        notionUrl = notionResult.pageUrl;
      }
    } catch (notionError) {
      console.warn('[Account Created] Could not fetch Notion URL:', notionError);
    }

    // Send Slack notification
    const slackMessage = {
      text: `✅ Account Created: ${email} - ${displayTier} (${displayBillingCycle})`,
      attachments: [
        {
          color: '#9be382', // Green - ready to proceed
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Account Created*\n\n*Customer:* ${email}\n*Name:* ${displayName || 'Not provided'}\n*Plan:* ${displayTier} (${displayBillingCycle})`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Status:* 🟢 Ready for technical onboarding\n\n*Next Steps:*\n• Wait for WordPress credentials (customer submits via dashboard)\n• Begin security scan + backup once credentials received\n• Complete onboarding within 48 hours`,
              },
            },
            ...(notionUrl
              ? [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `<${notionUrl}|View lead in Notion>`,
                    },
                  },
                ]
              : []),
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `User ID: ${userId || 'N/A'}`,
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      console.error(`❌ [Account Created] Slack error: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to send Slack notification' },
        { status: 500 }
      );
    }

    // Update Notion status to "Closed Won" now that account is created
    try {
      const notionResult = await updateLeadStatus(
        email.toLowerCase().trim(),
        'Closed Won'
      );

      if (notionResult.success) {
        console.log(`✅ [Account Created] Notion updated to Closed Won: ${email}`);
      } else if (!notionResult.found) {
        console.log(`ℹ️ [Account Created] Lead not in Notion: ${email}`);
      }
    } catch (notionError) {
      console.warn('[Account Created] Notion update failed (non-blocking):', notionError);
    }

    console.log(`✅ [Account Created] Slack notification sent for: ${email}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Account Created] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
