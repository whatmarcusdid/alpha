/**
 * Growth Ops / Clients Notion integration for prospect lifecycle tracking.
 *
 * Upserts one row per email across audit, purchase, and account-creation events.
 * Requires NOTION_GROWTH_OPS_DB_ID (data source ID) — no silent fallback.
 *
 * Select/status option strings must match the Growth Ops / Clients database exactly.
 */

import { Client } from '@notionhq/client';

/** Notion data source ID for Growth Ops / Clients (dashes stripped at runtime). */
function getGrowthOpsDataSourceId(): string | null {
  const raw = process.env.NOTION_GROWTH_OPS_DB_ID?.trim();
  if (!raw) {
    console.warn('[Growth Ops Notion] NOTION_GROWTH_OPS_DB_ID not set — skipping sync');
    return null;
  }
  return raw.replace(/-/g, '');
}

function getNotionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function extractBusinessName(page: { properties?: Record<string, unknown> }): string {
  const getTitle = (prop: unknown): string | undefined => {
    if (prop && typeof prop === 'object' && 'title' in prop) {
      const title = (prop as { title?: Array<{ plain_text?: string }> }).title;
      return title?.[0]?.plain_text;
    }
    return undefined;
  };

  return (
    getTitle(page.properties?.['Client / Company Name']) ??
    getTitle(page.properties?.['Company Name']) ??
    'Unknown Business'
  );
}

function buildTitle(content: string): Record<string, unknown> {
  return { title: [{ text: { content } }] };
}

function buildEmail(email: string): Record<string, unknown> {
  return { email };
}

function buildUrl(url: string): Record<string, unknown> {
  return { url: normalizeWebsiteUrl(url) };
}

function buildStatus(name: string): Record<string, unknown> {
  return { status: { name } };
}

function buildSelect(name: string): Record<string, unknown> {
  return { select: { name } };
}

function buildCheckbox(checked: boolean): Record<string, unknown> {
  return { checkbox: checked };
}

function buildDate(isoDate: string): Record<string, unknown> {
  return { date: { start: isoDate.split('T')[0] } };
}

/** Must match Growth Ops / Clients Notion schema option names exactly. */
export const GROWTH_OPS_VALUES = {
  funnelStage: {
    lead: 'Lead',
    needsReview: 'Needs Review',
    presentation: 'Presentation',
    checkoutStarted: 'Checkout Started',
    sale: 'Sale',
    clientOnboarding: 'Client Onboarding',
    activeClient: 'Active Client',
    lost: 'Lost',
  },
  orderStatus: {
    none: 'None',
    checkoutStarted: 'Checkout Started',
    paid: 'Paid',
    confirmed: 'Confirmed',
    fulfillmentStarted: 'Fulfillment Started',
    fulfilled: 'Fulfilled',
    refunded: 'Refunded',
  },
  paymentStatus: {
    notStarted: 'Not Started',
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  },
  clientDashboardStatus: {
    notCreated: 'Not Created',
    created: 'Created',
    invited: 'Invited',
    activated: 'Activated',
  },
} as const;

export interface GrowthOpsResult {
  success: boolean;
  created: boolean;
  found: boolean;
  pageId?: string;
  pageUrl?: string;
  businessName?: string;
  error?: string;
}

async function findProspectByEmail(
  notion: Client,
  dataSourceId: string,
  email: string
): Promise<GrowthOpsResult & { pageId?: string }> {
  const normalizedEmail = normalizeEmail(email);

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      property: 'Email',
      email: { equals: normalizedEmail },
    },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    result_type: 'page',
  });

  if (response.results.length === 0) {
    return { success: true, created: false, found: false };
  }

  const page = response.results[0];
  return {
    success: true,
    created: false,
    found: true,
    pageId: page.id,
    pageUrl: getNotionPageUrl(page.id),
    businessName: extractBusinessName(page as { properties?: Record<string, unknown> }),
  };
}

async function upsertProspectProperties(
  email: string,
  properties: Record<string, unknown>,
  createDefaults: {
    businessName: string;
    websiteUrl?: string;
  }
): Promise<GrowthOpsResult> {
  const apiKey = process.env.NOTION_API_KEY;
  const dataSourceId = getGrowthOpsDataSourceId();

  if (!apiKey) {
    console.warn('[Growth Ops Notion] NOTION_API_KEY not set');
    return {
      success: false,
      created: false,
      found: false,
      error: 'NOTION_API_KEY not configured',
    };
  }

  if (!dataSourceId) {
    return {
      success: false,
      created: false,
      found: false,
      error: 'NOTION_GROWTH_OPS_DB_ID not configured',
    };
  }

  const notion = new Client({ auth: apiKey });
  const normalizedEmail = normalizeEmail(email);

  try {
    const existing = await findProspectByEmail(notion, dataSourceId, normalizedEmail);

    if (existing.found && existing.pageId) {
      await notion.pages.update({
        page_id: existing.pageId,
        properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
      });

      console.log('[Growth Ops Notion] Updated prospect:', normalizedEmail);
      return {
        success: true,
        created: false,
        found: true,
        pageId: existing.pageId,
        pageUrl: existing.pageUrl,
        businessName: createDefaults.businessName || existing.businessName,
      };
    }

    const createProperties: Record<string, unknown> = {
      'Client / Company Name': buildTitle(createDefaults.businessName),
      Email: buildEmail(normalizedEmail),
      ...properties,
    };

    if (createDefaults.websiteUrl) {
      createProperties['Website URL'] = buildUrl(createDefaults.websiteUrl);
    }

    const response = await notion.pages.create({
      parent: {
        type: 'data_source_id',
        data_source_id: dataSourceId,
      },
      properties: createProperties as Parameters<typeof notion.pages.create>[0]['properties'],
    });

    console.log('[Growth Ops Notion] Created prospect:', normalizedEmail, response.id);
    return {
      success: true,
      created: true,
      found: false,
      pageId: response.id,
      pageUrl: getNotionPageUrl(response.id),
      businessName: createDefaults.businessName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Growth Ops Notion] Upsert error:', message);
    return {
      success: false,
      created: false,
      found: false,
      error: message,
    };
  }
}

export async function upsertAuditCompletion(params: {
  email: string;
  businessName: string;
  websiteUrl: string;
  submittedAt?: string;
}): Promise<GrowthOpsResult> {
  const submittedAt = params.submittedAt ?? new Date().toISOString();

  return upsertProspectProperties(
    params.email,
    {
      'Funnel Stage': buildStatus(GROWTH_OPS_VALUES.funnelStage.lead),
      'Audit Submitted At': buildDate(submittedAt),
      'Audit Results Ready': buildCheckbox(true),
      'Website URL': buildUrl(params.websiteUrl),
    },
    {
      businessName: params.businessName,
      websiteUrl: params.websiteUrl,
    }
  );
}

export async function upsertPurchaseCompletion(params: {
  email: string;
  businessName: string;
  websiteUrl?: string;
  purchaseType: 'subscription' | 'site_fix';
  productLabel: string;
  amount: number;
  paymentDate?: string;
}): Promise<GrowthOpsResult> {
  return upsertProspectProperties(
    params.email,
    {
      'Funnel Stage': buildStatus(GROWTH_OPS_VALUES.funnelStage.sale),
      'Order Status': buildStatus(GROWTH_OPS_VALUES.orderStatus.paid),
      'Payment Status': buildSelect(GROWTH_OPS_VALUES.paymentStatus.paid),
      ...(params.websiteUrl ? { 'Website URL': buildUrl(params.websiteUrl) } : {}),
    },
    {
      businessName: params.businessName,
      websiteUrl: params.websiteUrl,
    }
  );
}

export async function upsertAccountCreation(params: {
  email: string;
  businessName: string;
  websiteUrl?: string;
  accountType: 'subscription' | 'site_fix';
  productLabel?: string;
}): Promise<GrowthOpsResult> {
  return upsertProspectProperties(
    params.email,
    {
      'Funnel Stage': buildStatus(GROWTH_OPS_VALUES.funnelStage.clientOnboarding),
      'Account Created': buildCheckbox(true),
      ...(params.websiteUrl ? { 'Website URL': buildUrl(params.websiteUrl) } : {}),
    },
    {
      businessName: params.businessName,
      websiteUrl: params.websiteUrl,
    }
  );
}

export async function findGrowthOpsProspectByEmail(email: string): Promise<GrowthOpsResult> {
  const apiKey = process.env.NOTION_API_KEY;
  const dataSourceId = getGrowthOpsDataSourceId();

  if (!apiKey || !dataSourceId) {
    return { success: false, created: false, found: false, error: 'Notion not configured' };
  }

  const notion = new Client({ auth: apiKey });

  try {
    const result = await findProspectByEmail(notion, dataSourceId, email);
    return { ...result, created: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, created: false, found: false, error: message };
  }
}
