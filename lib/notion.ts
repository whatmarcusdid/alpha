'use server';

import { Client } from '@notionhq/client';

// TSG Sales Pipeline - data source ID (without dashes)
// Per Notion API 2025-09-03: use data_source_id for creating pages
// Get from Notion: Database → ⋮ → Manage data sources → Copy data source ID
const DATA_SOURCE_ID = (
  process.env.NOTION_SALES_PIPELINE_DB_ID || '2c37eae312ee8019b246000bb86549c2'
).replace(/-/g, '');

export async function addProspectToNotion(formData: {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  tradeType?: string;
  numEmployees?: string;
  biggestFrustration?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Notion] NOTION_API_KEY not set - skipping prospect sync');
    return { success: false, error: 'NOTION_API_KEY not configured' };
  }

  const notion = new Client({ auth: apiKey });

  try {
    const numEmployeesNumber = formData.numEmployees
      ? parseInt(formData.numEmployees) || 0
      : undefined;

    const properties: Record<string, unknown> = {
      'Company Name': {
        title: [{ text: { content: formData.businessName } }],
      },
      'First Name': {
        rich_text: [{ text: { content: formData.firstName } }],
      },
      'Last Name': {
        rich_text: [{ text: { content: formData.lastName } }],
      },
      Email: {
        email: formData.email,
      },
      'Website URL': {
        url: formData.websiteUrl,
      },
      Stage: {
        status: { name: 'Contacted' },
      },
      Priority: {
        select: { name: 'Warm' },
      },
    };

    if (formData.tradeType) {
      properties['Trade Type'] = {
        select: { name: formData.tradeType },
      };
    }

    if (numEmployeesNumber !== undefined) {
      properties['Number of Employees'] = {
        number: numEmployeesNumber,
      };
    }

    if (formData.biggestFrustration) {
      properties['Business Frustration'] = {
        rich_text: [{ text: { content: formData.biggestFrustration } }],
      };
    }

    const response = await notion.pages.create({
      parent: {
        type: 'data_source_id',
        data_source_id: DATA_SOURCE_ID,
      },
      properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
    });

    console.log('✅ Prospect added to Notion Sales Pipeline:', response.id);
    return { success: true, id: response.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error adding prospect to Notion:', message);
    return { success: false, error: message };
  }
}

export async function createAuditLeadRecord(params: {
  firstName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  speedGrade: string;
  securityGrade: string;
  seoGrade: string;
  seoScore: number;
  source: 'public_audit';
}): Promise<void> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Notion] NOTION_API_KEY not set - skipping audit lead sync');
    return;
  }

  const notion = new Client({ auth: apiKey });
  const seoDetail = `Score:${params.seoScore}/9`;

  try {
    await notion.pages.create({
      parent: {
        type: 'data_source_id',
        data_source_id: DATA_SOURCE_ID,
      },
      properties: {
        'Company Name': {
          title: [{ text: { content: params.businessName } }],
        },
        'First Name': {
          rich_text: [{ text: { content: params.firstName } }],
        },
        'Email': {
          email: params.email,
        },
        'Website URL': {
          url: params.websiteUrl,
        },
        'Speed Grade': {
          rich_text: [{ text: { content: params.speedGrade } }],
        },
        'Security Grade': {
          rich_text: [{ text: { content: params.securityGrade } }],
        },
        'UX Grade': {
          rich_text: [{ text: { content: params.seoGrade } }],
        },
        'UX Detail': {
          rich_text: [{ text: { content: seoDetail } }],
        },
        'Source': {
          rich_text: [{ text: { content: 'Genie Site Audit' } }],
        },
      },
    });

    console.log('[Notion] Audit lead added to Sales Pipeline:', params.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Notion] Error creating audit lead record:', message);
  }
}
