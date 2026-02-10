/**
 * POST /api/support/create-ticket
 * 
 * Creates a support ticket by:
 * 1. Creating a conversation in Help Scout
 * 2. Saving ticket reference to Firestore (users/{userId}/tickets)
 * 
 * Help Scout handles:
 * - Email confirmation to customer
 * - Slack notification (via existing HS integration)
 * - Conversation threading
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/middleware/auth';
import { createConversation } from '@/lib/helpscout/client';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  category: z.enum(['Updates', 'Bug Report', 'Question', 'Feature Request', 'Other']),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  description: z.string().min(20, 'Please provide more details (minimum 20 characters)'),
  attachmentUrls: z.array(z.string().url()).optional().default([]),
  customerEmail: z.string().email('Invalid email'),
  customerName: z.string().min(1, 'Name is required'),
});

export type CreateTicketRequest = z.infer<typeof createTicketSchema>;

const urgencyTags: Record<string, string> = {
  low: 'urgency-low',
  normal: 'urgency-normal',
  high: 'urgency-high',
  urgent: 'urgency-urgent',
};

const categoryTags: Record<string, string> = {
  'Updates': 'category-updates',
  'Bug Report': 'category-bug',
  'Question': 'category-question',
  'Feature Request': 'category-feature',
  'Other': 'category-other',
};

export async function POST(req: NextRequest) {
  // Authenticate the request
  const auth = await requireAuth(req);
  if (isAuthError(auth)) {
    return auth;
  }
  const { userId } = auth;

  console.log('🎫 Create ticket called, userId:', userId);

  try {
    // Validate admin DB is available
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json();
    console.log('🎫 Request body:', body);
    
    const validation = createTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Build message body with attachments and metadata
    let messageBody = data.description;
    
    if (data.attachmentUrls.length > 0) {
      messageBody += '\n\n---\n**Attachments:**\n';
      data.attachmentUrls.forEach((url, index) => {
        const fileName = decodeURIComponent(
          url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`
        );
        messageBody += `- [${fileName}](${url})\n`;
      });
    }

    messageBody += `\n---\n`;
    messageBody += `**Category:** ${data.category}\n`;
    messageBody += `**Urgency:** ${data.urgency}\n`;
    messageBody += `**Submitted via:** TSG Dashboard\n`;

    // Create conversation in Help Scout
    const helpScoutResult = await createConversation({
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      subject: `[${data.category}] ${data.title}`,
      message: messageBody,
      tags: [
        'dashboard-submitted',
        categoryTags[data.category] || 'category-other',
        urgencyTags[data.urgency] || 'urgency-normal',
      ],
    });

    if (!helpScoutResult.success) {
      console.error('❌ Failed to create Help Scout conversation:', helpScoutResult.error);
      return NextResponse.json(
        { error: 'Failed to create support ticket. Please try again or email support@tradesitegenie.com directly.' },
        { status: 500 }
      );
    }

    // Generate ticket ID
    const ticketId = `TSG-${Date.now().toString(36).toUpperCase()}`;

    // Save ticket to Firestore
    const ticketRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tickets')
      .doc(ticketId);

    const ticketData = {
      ticketId,
      helpScoutConversationId: helpScoutResult.conversationId,
      userId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      title: data.title,
      category: data.category,
      urgency: data.urgency,
      description: data.description,
      status: 'open',
      attachmentUrls: data.attachmentUrls,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'user',
          senderName: data.customerName,
          text: data.description,
          timestamp: new Date().toISOString(),
          attachmentUrls: data.attachmentUrls,
        },
      ],
    };

    await ticketRef.set(ticketData);

    console.log('✅ Support ticket created:', {
      ticketId,
      helpScoutConversationId: helpScoutResult.conversationId,
      userId,
    });

    return NextResponse.json({
      success: true,
      ticketId,
      helpScoutConversationId: helpScoutResult.conversationId,
      message: 'Support ticket created successfully. You will receive an email confirmation shortly.',
    });

  } catch (error: any) {
    console.error('❌ Create ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
