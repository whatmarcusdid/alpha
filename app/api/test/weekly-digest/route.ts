/**
 * Weekly Sales Digest Test Endpoint
 *
 * Manual trigger for testing the digest. Supports custom date ranges.
 * POST or GET - both will fetch data and send to Slack.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyRevenue } from '@/lib/weekly-digest/stripe';
import { getWeeklyPipelineMetrics } from '@/lib/weekly-digest/notion';
import {
  sendWeeklyDigest,
  formatWeeklyDigest,
  type WeeklyMetrics,
} from '@/lib/weekly-digest/slack';

export async function POST(req: NextRequest) {
  console.log('[Weekly Digest Test] Manual trigger received');

  let thisWeekStart: Date;
  let thisWeekEnd: Date;
  let lastWeekStart: Date;
  let lastWeekEnd: Date;

  try {
    const body = await req.json().catch(() => ({}));

    if (body.thisWeekStart && body.thisWeekEnd) {
      // Custom date range provided
      thisWeekStart = new Date(body.thisWeekStart);
      thisWeekEnd = new Date(body.thisWeekEnd);
      lastWeekEnd = new Date(thisWeekStart);
      lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    } else {
      // Default: past 7 days
      const now = new Date();
      thisWeekEnd = now;
      thisWeekStart = new Date(now);
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      lastWeekEnd = new Date(thisWeekStart);
      lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    }
  } catch {
    const now = new Date();
    thisWeekEnd = now;
    thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    lastWeekEnd = new Date(thisWeekStart);
    lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  }

  console.log(
    `[Weekly Digest Test] This week: ${thisWeekStart.toISOString()} to ${thisWeekEnd.toISOString()}`
  );

  try {
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
      cashCollected: thisWeekStripe.cashCollected,
      paymentCount: thisWeekStripe.paymentCount,
      appointmentsBooked: thisWeekNotion.appointmentsBooked,
      presentationsCompleted: thisWeekNotion.presentationsCompleted,
      newQualifiedLeads: thisWeekNotion.newQualifiedLeads,
      closedWonCount: thisWeekNotion.closedWonCount,
      totalClosedCount: thisWeekNotion.totalClosedCount,
      salesCycleDays: thisWeekNotion.salesCycleDays,

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

      stripeError: thisWeekStripe.error,
      notionError: thisWeekNotion.error,
    };

    // Generate the formatted message (for preview)
    const formattedMessage = formatWeeklyDigest(
      metrics,
      thisWeekStart,
      thisWeekEnd
    );

    // Send to Slack
    const result = await sendWeeklyDigest(metrics, thisWeekStart, thisWeekEnd);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      preview: formattedMessage,
      metrics: {
        thisWeek: {
          cashCollected: metrics.cashCollected,
          paymentCount: metrics.paymentCount,
          appointmentsBooked: metrics.appointmentsBooked,
          presentationsCompleted: metrics.presentationsCompleted,
          newQualifiedLeads: metrics.newQualifiedLeads,
          closedWonCount: metrics.closedWonCount,
          totalClosedCount: metrics.totalClosedCount,
          salesCycleDays: metrics.salesCycleDays,
        },
        lastWeek: metrics.lastWeek,
      },
      dateRange: {
        thisWeek: {
          start: thisWeekStart.toISOString(),
          end: thisWeekEnd.toISOString(),
        },
        lastWeek: {
          start: lastWeekStart.toISOString(),
          end: lastWeekEnd.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[Weekly Digest Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Support GET for easy browser testing
export async function GET(req: NextRequest) {
  return POST(req);
}
