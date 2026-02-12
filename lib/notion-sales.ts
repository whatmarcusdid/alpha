/**
 * Notion Sales Pipeline helper for TradeSiteGenie payment tracking.
 *
 * Queries TSG Sales Pipeline by email, updates lead status and payment details
 * after Stripe payment, and appends payment records to page body.
 * Server-side only - no browser checks needed.
 */

import { Client } from '@notionhq/client';

// TSG Sales Pipeline - collection/data source ID (without dashes)
const NOTION_SALES_PIPELINE_DB_ID = (
  process.env.NOTION_SALES_PIPELINE_DB_ID || '2c37eae312ee8019b246000bb86549c2'
).replace(/-/g, '');

// --- Types ---

export interface NotionSalesResult {
  success: boolean;
  found: boolean;
  pageId?: string;
  pageUrl?: string;
  businessName?: string;
  error?: string;
  duplicate?: boolean;
}

export interface PaymentUpdateData {
  email: string;
  status: string; // "Won - Awaiting Signup" or "Closed Won"
  paymentAmount: number; // Amount in dollars (e.g., 539)
  paymentDate: string; // ISO 8601 date string
  subscriptionTier: string; // "Essential", "Advanced", "Premium", "Safety Net"
  billingCycle: string; // "Annual", "Quarterly", "Monthly"
  stripeCustomerId: string; // "cus_xxx"
}

// --- Helpers ---

function getNotionPageUrl(pageId: string): string {
  const cleanId = pageId.replace(/-/g, '');
  return `https://www.notion.so/${cleanId}`;
}

function extractBusinessName(page: { properties?: Record<string, unknown> }): string {
  const getTitle = (prop: unknown): string | undefined => {
    if (prop && typeof prop === 'object' && 'title' in prop) {
      const title = (prop as { title?: Array<{ plain_text?: string }> }).title;
      return title?.[0]?.plain_text;
    }
    return undefined;
  };
  const businessName = getTitle(page.properties?.['Business Name']);
  if (businessName) return businessName;
  const companyName = getTitle(page.properties?.['Company Name']);
  if (companyName) return companyName;
  return 'Unknown Business';
}

function formatDateForDisplay(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

// --- API functions ---

/**
 * Find a lead in the Sales Pipeline by email (exact match, case-insensitive).
 * Returns most recent if duplicates exist, with duplicate: true.
 */
export async function findLeadByEmail(email: string): Promise<NotionSalesResult> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Notion Sales] NOTION_API_KEY not set');
    return { success: false, found: false, error: 'NOTION_API_KEY not configured' };
  }

  const notion = new Client({ auth: apiKey });
  const normalizedEmail = email.toLowerCase().trim();

  try {
    console.log('[Notion Sales] Searching for lead:', normalizedEmail);

    const response = await notion.dataSources.query({
      data_source_id: NOTION_SALES_PIPELINE_DB_ID,
      filter: {
        property: 'Email',
        email: { equals: normalizedEmail },
      },
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      result_type: 'page',
    });

    const results = response.results;

    if (results.length === 0) {
      console.log('[Notion Sales] Lead not found:', normalizedEmail);
      return { success: true, found: false };
    }

    const isDuplicate = results.length > 1;
    if (isDuplicate) {
      console.log('[Notion Sales] Duplicate leads found for', normalizedEmail, ', using most recent');
    }

    const page = results[0];
    const pageId = page.id;
    const businessName = extractBusinessName(page as { properties?: Record<string, unknown> });
    const pageUrl = getNotionPageUrl(pageId);

    console.log('[Notion Sales] Found lead:', businessName, '(pageId:', pageId, ')');

    return {
      success: true,
      found: true,
      pageId,
      pageUrl,
      businessName,
      duplicate: isDuplicate,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error && typeof error === 'object' && 'status' in error ? error.status : null;

    if (status === 429) {
      console.error('[Notion Sales] Rate limit exceeded');
      return { success: false, found: false, error: 'Rate limit exceeded' };
    }
    if (status === 403) {
      console.error('[Notion Sales] Permission denied');
      return { success: false, found: false, error: 'Permission denied' };
    }

    console.error('[Notion Sales] Error:', message);
    return { success: false, found: false, error: message };
  }
}

/**
 * Update a lead with payment details after Stripe payment.
 * Finds lead by email first; if not found, returns without creating a new page.
 */
export async function updateLeadWithPayment(
  data: PaymentUpdateData
): Promise<NotionSalesResult> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Notion Sales] NOTION_API_KEY not set');
    return { success: false, found: false, error: 'NOTION_API_KEY not configured' };
  }

  const notion = new Client({ auth: apiKey });
  const normalizedEmail = data.email.toLowerCase().trim();

  try {
    // Find lead first
    const findResult = await findLeadByEmail(normalizedEmail);
    if (!findResult.found || !findResult.pageId) {
      return { success: false, found: false, error: findResult.error };
    }

    const pageId = findResult.pageId;
    const businessName = findResult.businessName ?? 'Unknown';

    // Build properties object for Notion API
    const properties = {
      Status: { select: { name: data.status } },
      'Payment Amount': { number: data.paymentAmount },
      'Payment Date': { date: { start: data.paymentDate } },
      'Subscription Tier': { select: { name: data.subscriptionTier } },
      'Billing Cycle': { select: { name: data.billingCycle } },
      'Stripe Customer ID': {
        rich_text: [{ text: { content: data.stripeCustomerId } }],
      },
      ...(data.status === 'Closed Won' && {
        'Closed Won Date': { date: { start: data.paymentDate } },
      }),
    };

    await notion.pages.update({
      page_id: pageId,
      properties,
    });

    // Append payment block to page body
    const formattedDate = formatDateForDisplay(data.paymentDate);
    const paymentContent = [
      `**Date:** ${formattedDate}\n`,
      `**Amount:** $${data.paymentAmount}\n`,
      `**Plan:** ${data.subscriptionTier} (${data.billingCycle})\n`,
      `**Stripe Customer ID:** ${data.stripeCustomerId}\n`,
      `**Status:** Awaiting account creation`,
    ].join('');

    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: '💳 Payment Received' } }],
          },
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: paymentContent } }],
          },
        },
        {
          type: 'divider',
          divider: {},
        },
      ],
    });

    console.log('[Notion Sales] Updated payment details for:', businessName);

    return {
      success: true,
      found: true,
      pageId,
      pageUrl: findResult.pageUrl,
      businessName,
      duplicate: findResult.duplicate,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error && typeof error === 'object' && 'status' in error ? error.status : null;

    if (status === 429) {
      console.error('[Notion Sales] Rate limit exceeded');
      return { success: false, found: false, error: 'Rate limit exceeded' };
    }
    if (status === 403) {
      console.error('[Notion Sales] Permission denied');
      return { success: false, found: false, error: 'Permission denied' };
    }

    console.error('[Notion Sales] Error:', message);
    return { success: false, found: false, error: message };
  }
}

/**
 * Update only the lead status (e.g. to "Closed Won" when account is created).
 * Does not overwrite payment details or append blocks.
 */
export async function updateLeadStatus(
  email: string,
  status: string
): Promise<NotionSalesResult> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Notion Sales] NOTION_API_KEY not set');
    return { success: false, found: false, error: 'NOTION_API_KEY not configured' };
  }

  const notion = new Client({ auth: apiKey });
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const findResult = await findLeadByEmail(normalizedEmail);
    if (!findResult.found || !findResult.pageId) {
      return { success: false, found: false, error: findResult.error };
    }

    const properties: Record<string, unknown> = {
      Status: { select: { name: status } },
    };

    if (status === 'Closed Won') {
      properties['Closed Won Date'] = {
        date: { start: new Date().toISOString() },
      };
    }

    await notion.pages.update({
      page_id: findResult.pageId,
      properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
    });

    console.log('[Notion Sales] Updated status to:', status, 'for:', findResult.businessName);

    return {
      success: true,
      found: true,
      pageId: findResult.pageId,
      pageUrl: findResult.pageUrl,
      businessName: findResult.businessName,
      duplicate: findResult.duplicate,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errStatus = error && typeof error === 'object' && 'status' in error ? error.status : null;

    if (errStatus === 429) {
      console.error('[Notion Sales] Rate limit exceeded');
      return { success: false, found: false, error: 'Rate limit exceeded' };
    }
    if (errStatus === 403) {
      console.error('[Notion Sales] Permission denied');
      return { success: false, found: false, error: 'Permission denied' };
    }

    console.error('[Notion Sales] Error:', message);
    return { success: false, found: false, error: message };
  }
}
