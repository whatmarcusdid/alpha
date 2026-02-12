/**
 * Slack helper for Weekly Sales Digest
 *
 * Formats and sends the weekly sales digest message to Slack.
 * Includes week-over-week comparison with trend indicators.
 */

// --- Types ---

export interface WeeklyMetrics {
  // This week
  cashCollected: number;
  paymentCount: number;
  appointmentsBooked: number;
  presentationsCompleted: number;
  newQualifiedLeads: number;
  closedWonCount: number;
  totalClosedCount: number;
  salesCycleDays: number | null;

  // Last week (for comparison)
  lastWeek: {
    cashCollected: number;
    paymentCount: number;
    appointmentsBooked: number;
    presentationsCompleted: number;
    newQualifiedLeads: number;
    closedWonCount: number;
    totalClosedCount: number;
    salesCycleDays: number | null;
  };

  // Errors (if any)
  stripeError?: string;
  notionError?: string;
}

export interface SlackDigestResult {
  success: boolean;
  error?: string;
}

// --- Helpers ---

function calculateTrend(
  current: number,
  previous: number
): { change: string; indicator: string } {
  if (previous === 0) {
    if (current === 0) {
      return { change: '—', indicator: '➡️' };
    }
    return { change: 'New', indicator: '📈' };
  }

  const percentChange = ((current - previous) / previous) * 100;
  const rounded = Math.round(percentChange);

  let indicator: string;
  if (percentChange > 10) {
    indicator = '📈';
  } else if (percentChange < -10) {
    indicator = '📉';
  } else {
    indicator = '➡️';
  }

  const sign = rounded >= 0 ? '+' : '';
  return { change: `${sign}${rounded}%`, indicator };
}

// For sales cycle, lower is better, so reverse indicators
function calculateSalesCycleTrend(
  current: number | null,
  previous: number | null
): { change: string; indicator: string } {
  if (current === null) {
    return { change: 'N/A', indicator: '' };
  }
  if (previous === null || previous === 0) {
    return { change: `${current} days`, indicator: '' };
  }

  const diff = current - previous;
  let indicator: string;
  if (diff < -1) {
    indicator = '📈'; // Improved (shorter)
  } else if (diff > 1) {
    indicator = '📉'; // Worse (longer)
  } else {
    indicator = '➡️';
  }

  const sign = diff >= 0 ? '+' : '';
  return { change: `${sign}${diff} days`, indicator };
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = end.getFullYear();
  return `${startStr} - ${endStr}, ${year}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// --- Exported Functions ---

export function formatWeeklyDigest(
  metrics: WeeklyMetrics,
  weekStart: Date,
  weekEnd: Date
): string {
  const dateRange = formatDateRange(weekStart, weekEnd);

  // Calculate all trends
  const cashTrend = calculateTrend(
    metrics.cashCollected,
    metrics.lastWeek.cashCollected
  );
  const appointmentsTrend = calculateTrend(
    metrics.appointmentsBooked,
    metrics.lastWeek.appointmentsBooked
  );
  const presentationsTrend = calculateTrend(
    metrics.presentationsCompleted,
    metrics.lastWeek.presentationsCompleted
  );
  const leadsTrend = calculateTrend(
    metrics.newQualifiedLeads,
    metrics.lastWeek.newQualifiedLeads
  );
  const salesCycleTrend = calculateSalesCycleTrend(
    metrics.salesCycleDays,
    metrics.lastWeek.salesCycleDays
  );

  // Calculate win rate
  const winRate =
    metrics.totalClosedCount > 0
      ? Math.round((metrics.closedWonCount / metrics.totalClosedCount) * 100)
      : null;
  const lastWinRate =
    metrics.lastWeek.totalClosedCount > 0
      ? Math.round(
          (metrics.lastWeek.closedWonCount / metrics.lastWeek.totalClosedCount) *
            100
        )
      : null;
  const winRateTrend =
    winRate !== null && lastWinRate !== null
      ? calculateTrend(winRate, lastWinRate)
      : {
          change: winRate !== null ? 'New' : 'N/A',
          indicator: '',
        };

  // Calculate average selling price
  const avgPrice =
    metrics.closedWonCount > 0
      ? Math.round(metrics.cashCollected / metrics.closedWonCount)
      : null;
  const lastAvgPrice =
    metrics.lastWeek.closedWonCount > 0
      ? Math.round(
          metrics.lastWeek.cashCollected / metrics.lastWeek.closedWonCount
        )
      : null;
  const avgPriceTrend =
    avgPrice !== null && lastAvgPrice !== null
      ? calculateTrend(avgPrice, lastAvgPrice)
      : { change: avgPrice !== null ? 'New' : 'N/A', indicator: '' };

  // Build message
  let message = `📊 *Weekly Sales Performance* | ${dateRange}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Revenue section
  message += `💰 *Revenue*\n`;
  message += `• Cash Collected: ${formatCurrency(metrics.cashCollected)} (${cashTrend.change} ${cashTrend.indicator})\n`;
  message += `• Avg Selling Price: ${avgPrice !== null ? formatCurrency(avgPrice) : 'N/A'} (${avgPriceTrend.change} ${avgPriceTrend.indicator})\n\n`;

  // Activity section
  message += `📞 *Activity*\n`;
  message += `• Appointments Booked: ${metrics.appointmentsBooked} (${appointmentsTrend.change} ${appointmentsTrend.indicator})\n`;
  message += `• Presentations Completed: ${metrics.presentationsCompleted} (${presentationsTrend.change} ${presentationsTrend.indicator})\n`;
  message += `• New Qualified Leads: ${metrics.newQualifiedLeads} (${leadsTrend.change} ${leadsTrend.indicator})\n\n`;

  // Performance section
  message += `📈 *Performance*\n`;
  message += `• Sales Cycle: ${metrics.salesCycleDays !== null ? `${metrics.salesCycleDays} days` : 'N/A'} (${salesCycleTrend.change} ${salesCycleTrend.indicator})\n`;
  message += `• Win Rate: ${winRate !== null ? `${winRate}%` : 'N/A'} (${winRateTrend.change} ${winRateTrend.indicator})\n\n`;

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Warnings if any errors
  if (metrics.stripeError) {
    message += `⚠️ _Stripe data may be incomplete: ${metrics.stripeError}_\n`;
  }
  if (metrics.notionError) {
    message += `⚠️ _Notion data may be incomplete: ${metrics.notionError}_\n`;
  }

  message += `_Data: Stripe + Notion TSG Sales Pipeline_`;

  return message;
}

export async function sendWeeklyDigest(
  metrics: WeeklyMetrics,
  weekStart: Date,
  weekEnd: Date
): Promise<SlackDigestResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('[Weekly Digest] SLACK_WEBHOOK_URL not configured');
    return { success: false, error: 'Slack webhook not configured' };
  }

  const message = formatWeeklyDigest(metrics, weekStart, weekEnd);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Weekly Digest] Slack error:', errorText);
      return { success: false, error: errorText };
    }

    console.log('[Weekly Digest] Slack digest sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[Weekly Digest] Slack error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Slack error',
    };
  }
}
