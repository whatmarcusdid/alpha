/**
 * Help Scout API Client
 * 
 * Server-side only - uses Help Scout Mailbox API 2.0
 * Docs: https://developer.helpscout.com/mailbox-api/
 */

const HELPSCOUT_API_KEY = process.env.HELPSCOUT_API_KEY;
const HELPSCOUT_MAILBOX_ID = process.env.HELPSCOUT_MAILBOX_ID;
const HELPSCOUT_API_BASE = 'https://api.helpscout.net/v2';

export interface CreateConversationPayload {
  customerEmail: string;
  customerName: string;
  subject: string;
  message: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface AddReplyPayload {
  conversationId: number;
  customerEmail: string;
  message: string;
}

export interface ConversationThread {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  body: string;
  author: {
    email: string;
    name: string;
    type: 'customer' | 'user';
  };
}

export interface HelpScoutConversation {
  id: number;
  number: number;
  status: 'active' | 'pending' | 'closed' | 'spam';
  subject: string;
  createdAt: string;
  updatedAt: string;
  threads?: ConversationThread[];
}

/**
 * Get Base64 encoded API key for Basic Auth
 */
function getAuthHeader(): string {
  if (!HELPSCOUT_API_KEY) {
    throw new Error('HELPSCOUT_API_KEY environment variable is not set');
  }
  const credentials = Buffer.from(`${HELPSCOUT_API_KEY}:X`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Create a new conversation in Help Scout
 * Returns the conversation ID on success
 */
export async function createConversation(
  payload: CreateConversationPayload
): Promise<{ success: true; conversationId: number } | { success: false; error: string }> {
  if (!HELPSCOUT_MAILBOX_ID) {
    return { success: false, error: 'HELPSCOUT_MAILBOX_ID environment variable is not set' };
  }

  try {
    const requestBody = {
      subject: payload.subject,
      customer: {
        email: payload.customerEmail,
        firstName: payload.customerName.split(' ')[0],
        lastName: payload.customerName.split(' ').slice(1).join(' ') || '',
      },
      mailboxId: parseInt(HELPSCOUT_MAILBOX_ID, 10),
      type: 'email',
      status: 'active',
      threads: [
        {
          type: 'customer',
          customer: {
            email: payload.customerEmail,
          },
          text: payload.message,
        },
      ],
      tags: payload.tags || ['dashboard-submitted'],
    };

    console.log('📤 Creating Help Scout conversation:', {
      subject: payload.subject,
      customerEmail: payload.customerEmail,
      mailboxId: HELPSCOUT_MAILBOX_ID,
    });

    const response = await fetch(`${HELPSCOUT_API_BASE}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Help Scout API error:', response.status, errorText);
      return { 
        success: false, 
        error: `Help Scout API error: ${response.status} - ${errorText}` 
      };
    }

    // Help Scout returns the conversation ID in the Location header
    const locationHeader = response.headers.get('Location');
    if (!locationHeader) {
      return { success: false, error: 'No Location header returned from Help Scout' };
    }

    // Extract conversation ID from Location header
    // Format: https://api.helpscout.net/v2/conversations/123456
    const conversationId = parseInt(locationHeader.split('/').pop() || '0', 10);
    
    if (!conversationId) {
      return { success: false, error: 'Could not parse conversation ID from Location header' };
    }

    console.log('✅ Help Scout conversation created:', conversationId);
    return { success: true, conversationId };

  } catch (error: any) {
    console.error('❌ Help Scout createConversation error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create conversation' 
    };
  }
}

/**
 * Add a customer reply to an existing conversation
 */
export async function addCustomerReply(
  payload: AddReplyPayload
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const requestBody = {
      type: 'customer',
      customer: {
        email: payload.customerEmail,
      },
      text: payload.message,
    };

    console.log('📤 Adding customer reply to Help Scout conversation:', payload.conversationId);

    const response = await fetch(
      `${HELPSCOUT_API_BASE}/conversations/${payload.conversationId}/threads`,
      {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Help Scout API error:', response.status, errorText);
      return { 
        success: false, 
        error: `Help Scout API error: ${response.status} - ${errorText}` 
      };
    }

    console.log('✅ Customer reply added to Help Scout conversation');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Help Scout addCustomerReply error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to add customer reply' 
    };
  }
}

/**
 * Get a conversation by ID with all threads
 */
export async function getConversation(
  conversationId: number
): Promise<{ success: true; conversation: HelpScoutConversation } | { success: false; error: string }> {
  try {
    console.log('📥 Fetching Help Scout conversation:', conversationId);

    const response = await fetch(
      `${HELPSCOUT_API_BASE}/conversations/${conversationId}?embed=threads`,
      {
        method: 'GET',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Help Scout API error:', response.status, errorText);
      return { 
        success: false, 
        error: `Help Scout API error: ${response.status} - ${errorText}` 
      };
    }

    const data = await response.json();
    const conversation = data._embedded?.conversations?.[0] || data;

    console.log('✅ Help Scout conversation fetched successfully');
    return { success: true, conversation };

  } catch (error: any) {
    console.error('❌ Help Scout getConversation error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get conversation' 
    };
  }
}
