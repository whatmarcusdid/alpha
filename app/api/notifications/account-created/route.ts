/**
 * Account Created Notification API
 *
 * Sends the "Account Created" Slack notification after signup.
 * Also upserts Growth Ops / Clients prospect record on account creation.
 * Called from SignUpForm after successful account creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendInternalOpsNotification } from '@/lib/internal-ops-notification';
import {
  findGrowthOpsProspectByEmail,
  upsertAccountCreation,
} from '@/lib/notion-growth-ops';
import { isSlackNotificationsEnabled } from '@/lib/slack-enabled';

async function updateGrowthOpsAccountCreated(params: {
  email: string;
  tier?: string;
  billingCycle?: string;
}): Promise<{ pageUrl?: string; businessName?: string }> {
  const normalizedEmail = params.email.toLowerCase().trim();
  const displayTier = params.tier
    ? params.tier.charAt(0).toUpperCase() + params.tier.slice(1)
    : 'Essential';
  const displayBillingCycle = params.billingCycle
    ? params.billingCycle.charAt(0).toUpperCase() + params.billingCycle.slice(1)
    : 'Annual';

  try {
    const existing = await findGrowthOpsProspectByEmail(normalizedEmail);
    const businessName = existing.businessName ?? 'Unknown Business';

    const notionResult = await upsertAccountCreation({
      email: normalizedEmail,
      businessName,
      accountType: 'subscription',
      productLabel: `${displayTier} (${displayBillingCycle})`,
    });

    if (notionResult.success) {
      console.log(`✅ [Account Created] Growth Ops upserted: ${normalizedEmail}`);
    } else {
      console.warn('[Account Created] Growth Ops upsert failed:', notionResult.error);
    }

    void sendInternalOpsNotification({
      eventType: 'account_created',
      prospectEmail: normalizedEmail,
      businessName: notionResult.businessName ?? businessName,
      details: `${displayTier} (${displayBillingCycle})`,
      notionPageUrl: notionResult.pageUrl,
    }).catch((err) =>
      console.warn('[Account Created] Internal ops email failed (non-blocking):', err)
    );

    return {
      pageUrl: notionResult.pageUrl,
      businessName: notionResult.businessName ?? businessName,
    };
  } catch (notionError) {
    console.warn('[Account Created] Growth Ops update failed (non-blocking):', notionError);
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, displayName, tier, billingCycle } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`[Account Created] Processing for: ${email}`);

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    const slackEnabled = isSlackNotificationsEnabled() && Boolean(webhookUrl);

    if (!isSlackNotificationsEnabled()) {
      console.log('[Account Created] Slack notifications disabled, skipping Slack');
    } else if (!webhookUrl) {
      console.warn('[Account Created] SLACK_WEBHOOK_URL not configured');
    }

    const growthOpsResult = await updateGrowthOpsAccountCreated({ email, tier, billingCycle });

    if (slackEnabled) {
      const displayTier = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Essential';
      const displayBillingCycle = billingCycle
        ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
        : 'Annual';

      const notionUrl = growthOpsResult.pageUrl;

      const slackMessage = {
        text: `✅ Account Created: ${email} - ${displayTier} (${displayBillingCycle})`,
        attachments: [
          {
            color: '#9be382',
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
                        text: `<${notionUrl}|View prospect in Growth Ops>`,
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

      const response = await fetch(webhookUrl!, {
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

      console.log(`✅ [Account Created] Slack notification sent for: ${email}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Account Created] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
