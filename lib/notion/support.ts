
export interface NotionSupportRequest {
  customerEmail: string;
  description: string;
  attachmentUrls?: string[];
}

export async function submitNotionSupportRequest(
  requestData: NotionSupportRequest
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    // Import Notion MCP functions dynamically (browser-only)
    if (typeof window === 'undefined') {
      return { success: false, error: 'Notion integration only available in browser' };
    }

    // Build description with attachment links if present
    let fullDescription = requestData.description;
    
    if (requestData.attachmentUrls && requestData.attachmentUrls.length > 0) {
      fullDescription += '\n\n**Attachments:**\n';
      requestData.attachmentUrls.forEach((url, index) => {
        const fileName = url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`;
        fullDescription += `- [${decodeURIComponent(fileName)}](${url})\n`;
      });
    }

    // Prepare the Notion page properties
    const properties = {
      'Task/Ticket Title': `Support Request from ${requestData.customerEmail}`,
      'Customer': requestData.customerEmail,
      'Description': fullDescription,
      'Type': 'Support Ticket',
      'Status': 'New',
      'Priority': 'Medium',
      'Assigned To': 'Unassigned',
      'date:Reported Date:start': new Date().toISOString().split('T')[0],
      'date:Reported Date:is_datetime': 0,
      'date:Created Date:start': new Date().toISOString().split('T')[0],
      'date:Created Date:is_datetime': 0,
    };

    // This will be called by the support page component
    // The actual Notion API call will be made from the component
    return {
      success: true,
      requestId: 'pending', // Will be updated after Notion API call
    };
  } catch (error: any) {
    console.error('Error preparing Notion support request:', error);
    return {
      success: false,
      error: error.message || 'Failed to prepare support request',
    };
  }
}

// Helper to format properties for Notion API
export function formatNotionProperties(requestData: NotionSupportRequest) {
  let fullDescription = requestData.description;
  
  if (requestData.attachmentUrls && requestData.attachmentUrls.length > 0) {
    fullDescription += '\n\n**Attachments:**\n';
    requestData.attachmentUrls.forEach((url, index) => {
      const fileName = url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`;
      fullDescription += `- [${decodeURIComponent(fileName)}](${url})\n`;
    });
  }

  return {
    'Task/Ticket Title': `Support Request from ${requestData.customerEmail}`,
    'Customer': requestData.customerEmail,
    'Description': fullDescription,
    'Type': 'Support Ticket',
    'Status': 'New',
    'Priority': 'Medium',
    'Assigned To': 'Unassigned',
    'date:Reported Date:start': new Date().toISOString().split('T')[0],
    'date:Reported Date:is_datetime': 0,
    'date:Created Date:start': new Date().toISOString().split('T')[0],
    'date:Created Date:is_datetime': 0,
  };
}
