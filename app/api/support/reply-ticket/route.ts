/**
 * POST /api/support/reply-ticket
 * 
 * Allows customers to reply to their support tickets from the dashboard.
 * Adds the reply to Help Scout conversation and saves to Firestore.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/middleware/auth';
import { addCustomerReply } from '@/lib/helpscout/client';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const replyTicketSchema = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required'),
  message: z.string().min(1, 'Message is required').max(10000, 'Message is too long (max 10,000 characters)'),
  attachmentUrls: z.array(z.string().url()).optional().default([]),
});

export type ReplyTicketRequest = z.infer<typeof replyTicketSchema>;

export async function POST(req: NextRequest) {
  // Authenticate the request
  const auth = await requireAuth(req);
  if (isAuthError(auth)) {
    return auth;
  }
  const { userId } = auth;

  console.log('💬 Reply ticket called, userId:', userId);

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
    console.log('💬 Request body:', body);

    const validation = replyTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get ticket from Firestore
    const ticketRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('tickets')
      .doc(data.ticketId);

    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      console.error('❌ Ticket not found:', data.ticketId);
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticket = ticketDoc.data();

    if (!ticket) {
      console.error('❌ Ticket data is empty');
      return NextResponse.json(
        { error: 'Ticket data is invalid' },
        { status: 500 }
      );
    }

    // Verify ticket belongs to authenticated user
    if (ticket.userId !== userId) {
      console.error('❌ Ticket does not belong to user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build message body with attachments
    let fullMessage = data.message;

    if (data.attachmentUrls.length > 0) {
      fullMessage += '\n\n---\n**Attachments:**\n';
      data.attachmentUrls.forEach((url, index) => {
        const fileName = decodeURIComponent(
          url.split('/').pop()?.split('?')[0] || `attachment-${index + 1}`
        );
        fullMessage += `- [${fileName}](${url})\n`;
      });
    }

    fullMessage += '\n---\n';
    fullMessage += '**Sent from:** TSG Dashboard\n';

    // Send reply to Help Scout
    if (!ticket.helpScoutConversationId) {
      console.error('❌ No Help Scout conversation ID found for ticket');
      return NextResponse.json(
        { error: 'Cannot reply to this ticket (no Help Scout conversation)' },
        { status: 400 }
      );
    }

    const helpScoutResult = await addCustomerReply({
      conversationId: ticket.helpScoutConversationId,
      customerEmail: ticket.customerEmail,
      message: fullMessage,
    });

    if (!helpScoutResult.success) {
      console.error('❌ Failed to send reply to Help Scout:', helpScoutResult.error);
      return NextResponse.json(
        { error: 'Failed to send reply. Please try emailing support@tradesitegenie.com directly.' },
        { status: 500 }
      );
    }

    // Save message to Firestore
    const message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      senderName: ticket.customerName || ticket.customerEmail,
      senderEmail: ticket.customerEmail,
      text: data.message,
      timestamp: new Date().toISOString(),
      source: 'dashboard',
      attachmentUrls: data.attachmentUrls,
    };

    // Update ticket in Firestore
    await ticketRef.update({
      messages: FieldValue.arrayUnion(message),
      status: 'open', // Re-open ticket on customer reply
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('✅ Reply sent and saved to ticket:', data.ticketId);

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully',
    });

  } catch (error: any) {
    console.error('❌ Reply ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
