/**
 * Support Ticket Client Functions
 * 
 * Client-side functions for interacting with the support ticket API.
 * These call our Next.js API routes which handle Help Scout integration.
 */

import { auth } from '@/lib/firebase';

export type TicketCategory = 'Updates' | 'Bug Report' | 'Question' | 'Feature Request' | 'Other';
export type TicketUrgency = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateTicketData {
  title: string;
  category: TicketCategory;
  urgency: TicketUrgency;
  description: string;
  attachmentUrls?: string[];
}

export interface CreateTicketResponse {
  success: boolean;
  ticketId?: string;
  helpScoutConversationId?: number;
  message?: string;
  error?: string;
}

/**
 * Create a new support ticket
 * 
 * This calls our API which:
 * 1. Creates a conversation in Help Scout
 * 2. Saves ticket reference to Firestore
 * 3. Triggers email confirmation via Help Scout
 * 4. Triggers Slack notification via Help Scout integration
 */
export async function createSupportTicket(
  data: CreateTicketData
): Promise<CreateTicketResponse> {
  try {
    const user = auth?.currentUser;
    if (!user) {
      return { success: false, error: 'You must be logged in to submit a support ticket' };
    }

    const token = await user.getIdToken();

    const customerName = user.displayName || user.email?.split('@')[0] || 'Customer';
    const customerEmail = user.email;

    if (!customerEmail) {
      return { success: false, error: 'No email associated with your account' };
    }

    const response = await fetch('/api/support/create-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...data,
        customerEmail,
        customerName,
        attachmentUrls: data.attachmentUrls || [],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to create support ticket' 
      };
    }

    return {
      success: true,
      ticketId: result.ticketId,
      helpScoutConversationId: result.helpScoutConversationId,
      message: result.message,
    };

  } catch (error: any) {
    console.error('❌ Create ticket error:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
}

/**
 * Reply to an existing support ticket
 * 
 * This calls our API which sends the reply to Help Scout,
 * triggering notifications to support team.
 */
export async function replyToTicket(
  ticketId: string,
  message: string,
  attachmentUrls?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth?.currentUser;
    if (!user) {
      return { success: false, error: 'You must be logged in to reply' };
    }

    const token = await user.getIdToken();

    const response = await fetch('/api/support/reply-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ticketId,
        message,
        attachmentUrls: attachmentUrls || [],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to send reply' 
      };
    }

    return { success: true };

  } catch (error: any) {
    console.error('❌ Reply ticket error:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
}
