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
  tradeType: string;
  numEmployees: string;
  biggestFrustration: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.warn('[Notion] NOTION_API_KEY not set - skipping prospect sync');
    return { success: false, error: 'NOTION_API_KEY not configured' };
  }

  const notion = new Client({ auth: apiKey });

  try {
    // Convert numEmployees to number (it comes as string from form)
    const numEmployeesNumber = parseInt(formData.numEmployees) || 0;

    const response = await notion.pages.create({
      parent: {
        type: 'data_source_id',
        data_source_id: DATA_SOURCE_ID,
      },
      properties: {
        'Company Name': {
          title: [{ text: { content: formData.businessName } }],
        },
        'First Name': {
          rich_text: [{ text: { content: formData.firstName } }],
        },
        'Last Name': {
          rich_text: [{ text: { content: formData.lastName } }],
        },
        'Email': {
          email: formData.email,
        },
        'Website URL': {
          url: formData.websiteUrl,
        },
        'Trade Type': {
          select: { name: formData.tradeType },
        },
        'Number of Employees': {
          number: numEmployeesNumber,
        },
        'Business Frustration': {
          rich_text: [{ text: { content: formData.biggestFrustration } }],
        },
        'Stage': {
          status: { name: 'Contacted' },
        },
        'Priority': {
          select: { name: 'Warm' },
        },
      },
    });

    console.log('✅ Prospect added to Notion Sales Pipeline:', response.id);
    return { success: true, id: response.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error adding prospect to Notion:', message);
    return { success: false, error: message };
  }
}
