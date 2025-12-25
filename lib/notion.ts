'use server';

import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// TSG Sales Pipeline Data Source ID
const DATA_SOURCE_ID = '2c37eae312ee803dbe79f6842267afce';

export async function addProspectToNotion(formData: {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  tradeType: string;
  numEmployees: string;
  biggestFrustration: string;
}) {
  try {
    // Convert numEmployees to number (it comes as string from form)
    const numEmployeesNumber = parseInt(formData.numEmployees) || 0;

    const response = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: DATA_SOURCE_ID,
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
    console.error('❌ Error adding prospect to Notion:', error);
    throw error;
  }
}
