/**
 * Weekly Sales Digest Cron Endpoint
 *
 * Called by Vercel Cron every Monday at 9 AM EST.
 * Fetches Stripe revenue + Notion pipeline metrics, formats and sends to Slack.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyRevenue } from '@/lib/weekly-digest/stripe';
import { getWeeklyPipelineMetrics } from '@/lib/weekly-digest/notion';
import { sendWeeklyDigest, type WeeklyMetrics } from '@/lib/weekly-digest/slack';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('[Weekly Digest] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Weekly Digest] Starting weekly digest generation...');

  try {
    // Calculate date ranges
    const now = new Date();

    // This week: past 7 days
    const thisWeekEnd = now;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);

    // Last week: 7-14 days ago
    const lastWeekEnd = new Date(thisWeekStart);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    console.log(
      `[Weekly Digest] This week: ${thisWeekStart.toISOString()} to ${thisWeekEnd.toISOString()}`
    );
    console.log(
      `[Weekly Digest] Last week: ${lastWeekStart.toISOString()} to ${lastWeekEnd.toISOString()}`
    );

    // Fetch this week's data
    const [thisWeekStripe, thisWeekNotion] = await Promise.all([
      getWeeklyRevenue(thisWeekStart, thisWeekEnd),
      getWeeklyPipelineMetrics(thisWeekStart, thisWeekEnd),
    ]);

    // Fetch last week's data
    const [lastWeekStripe, lastWeekNotion] = await Promise.all([
      getWeeklyRevenue(lastWeekStart, lastWeekEnd),
      getWeeklyPipelineMetrics(lastWeekStart, lastWeekEnd),
    ]);

    // Combine into WeeklyMetrics
    const metrics: WeeklyMetrics = {
      // This week
      cashCollected: thisWeekStripe.cashCollected,
      paymentCount: thisWeekStripe.paymentCount,
      appointmentsBooked: thisWeekNotion.appointmentsBooked,
      presentationsCompleted: thisWeekNotion.presentationsCompleted,
      newQualifiedLeads: thisWeekNotion.newQualifiedLeads,
      closedWonCount: thisWeekNotion.closedWonCount,
      totalClosedCount: thisWeekNotion.totalClosedCount,
      salesCycleDays: thisWeekNotion.salesCycleDays,

      // Last week
      lastWeek: {
        cashCollected: lastWeekStripe.cashCollected,
        paymentCount: lastWeekStripe.paymentCount,
        appointmentsBooked: lastWeekNotion.appointmentsBooked,
        presentationsCompleted: lastWeekNotion.presentationsCompleted,
        newQualifiedLeads: lastWeekNotion.newQualifiedLeads,
        closedWonCount: lastWeekNotion.closedWonCount,
        totalClosedCount: lastWeekNotion.totalClosedCount,
        salesCycleDays: lastWeekNotion.salesCycleDays,
      },

      // Errors
      stripeError: thisWeekStripe.error,
      notionError: thisWeekNotion.error,
    };

    // Send to Slack
    const result = await sendWeeklyDigest(metrics, thisWeekStart, thisWeekEnd);

    if (result.success) {
      console.log('[Weekly Digest] Successfully sent weekly digest');
      return NextResponse.json({
        success: true,
        message: 'Weekly digest sent',
        metrics: {
          cashCollected: metrics.cashCollected,
          appointmentsBooked: metrics.appointmentsBooked,
          closedWonCount: metrics.closedWonCount,
        },
      });
    } else {
      console.error('[Weekly Digest] Failed to send digest:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Weekly Digest] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
