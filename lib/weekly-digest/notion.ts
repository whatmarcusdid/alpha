/**
 * Notion helper for Weekly Sales Digest
 *
 * Queries TSG Sales Pipeline for leads updated within a date range
 * and calculates pipeline metrics based on status values.
 */

import { Client } from '@notionhq/client';

// TSG Sales Pipeline - collection/data source ID (without dashes)
const SALES_PIPELINE_DB_ID = (
  process.env.NOTION_SALES_PIPELINE_DB_ID || '2c37eae312ee8019b246000bb86549c2'
).replace(/-/g, '');

export interface NotionPipelineResult {
  appointmentsBooked: number; // Status = "Call Scheduled"
  presentationsCompleted: number; // Status = "Call Completed"
  newQualifiedLeads: number; // Status = "Replied - Interested"
  closedWonCount: number; // Status = "Closed Won"
  totalClosedCount: number; // All closed statuses
  salesCycleDays: number | null; // Avg days from Replied Interested Date to Closed Won Date
  error?: string;
}


function getStatus(lead: { properties?: Record<string, unknown> }): string | undefined {
  const statusProp = lead.properties?.['Status'];
  if (!statusProp || typeof statusProp !== 'object') return undefined;
  // Select type (e.g. "Closed Won", "Call Scheduled")
  if ('select' in statusProp) {
    return (statusProp as { select?: { name?: string } }).select?.name;
  }
  // Status type (Notion's newer status property)
  if ('status' in statusProp) {
    return (statusProp as { status?: { name?: string } }).status?.name;
  }
  return undefined;
}

function getDateValue(
  lead: { properties?: Record<string, unknown> },
  propertyName: string
): string | undefined {
  const prop = lead.properties?.[propertyName];
  if (prop && typeof prop === 'object' && 'date' in prop) {
    const date = (prop as { date?: { start?: string } }).date;
    return date?.start;
  }
  return undefined;
}

export async function getWeeklyPipelineMetrics(
  startDate: Date,
  endDate: Date
): Promise<NotionPipelineResult> {
  console.log('[Weekly Digest] Using database ID:', SALES_PIPELINE_DB_ID);
  console.log('[Weekly Digest] Raw env var:', process.env.NOTION_SALES_PIPELINE_DB_ID);

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Weekly Digest] NOTION_API_KEY not set');
    return {
      appointmentsBooked: 0,
      presentationsCompleted: 0,
      newQualifiedLeads: 0,
      closedWonCount: 0,
      totalClosedCount: 0,
      salesCycleDays: null,
      error: 'NOTION_API_KEY not configured',
    };
  }

  try {
    const notion = new Client({ auth: apiKey });

    // Format dates for Notion API (ISO 8601)
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Query all leads updated within the date range
    const response = await notion.dataSources.query({
      data_source_id: SALES_PIPELINE_DB_ID,
      filter: {
        and: [
          {
            timestamp: 'last_edited_time',
            last_edited_time: {
              on_or_after: startISO,
            },
          },
          {
            timestamp: 'last_edited_time',
            last_edited_time: {
              before: endISO,
            },
          },
        ],
      },
      page_size: 100,
      result_type: 'page',
    });

    const leads = response.results as { properties?: Record<string, unknown> }[];

    // Count by status
    let appointmentsBooked = 0;
    let presentationsCompleted = 0;
    let newQualifiedLeads = 0;
    let closedWonCount = 0;
    let totalClosedCount = 0;

    // For sales cycle calculation
    const salesCycleDays: number[] = [];

    const closedStatuses = [
      'Closed Won',
      'Closed Lost',
      'Closed - Not Interested',
      'Closed - Unresponsive',
    ];

    for (const lead of leads) {
      const status = getStatus(lead);

      if (status === 'Call Scheduled') {
        appointmentsBooked++;
      }
      if (status === 'Call Completed') {
        presentationsCompleted++;
      }
      if (status === 'Replied - Interested') {
        newQualifiedLeads++;
      }
      if (status === 'Closed Won') {
        closedWonCount++;

        // Calculate sales cycle if both dates exist
        const repliedDate = getDateValue(lead, 'Replied - Interested Date');
        const closedDate = getDateValue(lead, 'Closed Won Date');

        if (repliedDate && closedDate) {
          const replied = new Date(repliedDate);
          const closed = new Date(closedDate);
          const daysDiff = Math.round(
            (closed.getTime() - replied.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff >= 0) {
            salesCycleDays.push(daysDiff);
          }
        }
      }
      if (status && closedStatuses.includes(status)) {
        totalClosedCount++;
      }
    }

    // Calculate average sales cycle
    const avgSalesCycle =
      salesCycleDays.length > 0
        ? Math.round(
            salesCycleDays.reduce((a, b) => a + b, 0) / salesCycleDays.length
          )
        : null;

    console.log(
      `[Weekly Digest] Notion: ${leads.length} leads updated, ${closedWonCount} won, ${appointmentsBooked} calls booked`
    );

    return {
      appointmentsBooked,
      presentationsCompleted,
      newQualifiedLeads,
      closedWonCount,
      totalClosedCount,
      salesCycleDays: avgSalesCycle,
    };
  } catch (error) {
    console.error('[Weekly Digest] Notion error:', error);
    return {
      appointmentsBooked: 0,
      presentationsCompleted: 0,
      newQualifiedLeads: 0,
      closedWonCount: 0,
      totalClosedCount: 0,
      salesCycleDays: null,
      error: error instanceof Error ? error.message : 'Unknown Notion error',
    };
  }
}
