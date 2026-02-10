/**
 * Help Scout Webhook Handler
 * 
 * Receives events from Help Scout and syncs them to Firestore:
 * - Agent replies → Add to ticket messages
 * - Customer email replies → Add to ticket messages
 * - Status changes → Update ticket status
 * - Assignment changes → Update ticket assignedTo
 * 
 * Webhook events: https://developer.helpscout.com/mailbox-api/endpoints/webhooks/
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const HELPSCOUT_WEBHOOK_SECRET = process.env.HELPSCOUT_WEBHOOK_SECRET;

/**
 * Verify Help Scout webhook signature
 */
function verifySignature(body: string, signature: string | null): boolean {
  // Skip verification in dev if secret not configured
  if (!HELPSCOUT_WEBHOOK_SECRET) {
    console.warn('⚠️ HELPSCOUT_WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }

  if (!signature) {
    console.error('❌ No signature provided');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha1', HELPSCOUT_WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('base64');
    return digest === signature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * Extract ticket ID from subject line (format: TSG-XXXXXX or [Category] Title - TSG-XXXXXX)
 */
function extractTicketId(subject: string): string | null {
  const match = subject.match(/TSG-[A-Z0-9]+/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Find ticket in Firestore by ID or customer email
 */
async function findTicket(ticketId: string | null, customerEmail: string): Promise<{ userId: string; ticketId: string } | null> {
  if (!adminDb) {
    console.error('❌ Firebase Admin not initialized');
    return null;
  }

  try {
    // Try to find by ticket ID first
    if (ticketId) {
      const usersRef = adminDb.collection('users');
      const usersSnapshot = await usersRef.get();

      for (const userDoc of usersSnapshot.docs) {
        const ticketRef = userDoc.ref.collection('tickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();

        if (ticketDoc.exists) {
          console.log('✅ Found ticket by ID:', ticketId);
          return { userId: userDoc.id, ticketId };
        }
      }
    }

    // Fallback: search by customer email for open tickets
    console.log('🔍 Searching for ticket by email:', customerEmail);
    const usersRef = adminDb.collection('users');
    const usersSnapshot = await usersRef.get();

    for (const userDoc of usersSnapshot.docs) {
      const ticketsSnapshot = await userDoc.ref
        .collection('tickets')
        .where('customerEmail', '==', customerEmail)
        .where('status', 'in', ['open', 'pending'])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!ticketsSnapshot.empty) {
        const ticketDoc = ticketsSnapshot.docs[0];
        console.log('✅ Found ticket by email:', ticketDoc.id);
        return { userId: userDoc.id, ticketId: ticketDoc.id };
      }
    }

    console.warn('⚠️ No ticket found for:', { ticketId, customerEmail });
    return null;
  } catch (error) {
    console.error('❌ Error finding ticket:', error);
    return null;
  }
}

/**
 * Map Help Scout status to our status
 */
function mapStatus(helpScoutStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'open',
    'pending': 'pending',
    'closed': 'closed',
    'spam': 'closed',
  };
  return statusMap[helpScoutStatus] || 'open';
}

/**
 * Handle agent reply event
 */
async function handleAgentReply(data: any) {
  const conversation = data.conversation;
  const thread = data.thread;

  if (!conversation || !thread) {
    console.error('❌ Missing conversation or thread data');
    return { success: false, error: 'Invalid payload' };
  }

  const ticketId = extractTicketId(conversation.subject);
  const customerEmail = conversation.customer?.email;

  if (!customerEmail) {
    console.error('❌ No customer email in conversation');
    return { success: false, error: 'No customer email' };
  }

  const ticket = await findTicket(ticketId, customerEmail);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  // Add agent reply to messages
  const message = {
    id: `msg_hs_${thread.id || Date.now()}`,
    sender: 'support',
    senderName: thread.createdBy?.name || 'Support Team',
    text: thread.body || '',
    timestamp: thread.createdAt || new Date().toISOString(),
    source: 'helpscout',
    attachmentUrls: [],
  };

  const ticketRef = adminDb!.collection('users').doc(ticket.userId).collection('tickets').doc(ticket.ticketId);

  await ticketRef.update({
    messages: FieldValue.arrayUnion(message),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log('✅ Added agent reply to ticket:', ticket.ticketId);
  return { success: true };
}

/**
 * Handle customer email reply event
 */
async function handleCustomerReply(data: any) {
  const conversation = data.conversation;
  const thread = data.thread;

  if (!conversation || !thread) {
    console.error('❌ Missing conversation or thread data');
    return { success: false, error: 'Invalid payload' };
  }

  const ticketId = extractTicketId(conversation.subject);
  const customerEmail = conversation.customer?.email;

  if (!customerEmail) {
    console.error('❌ No customer email in conversation');
    return { success: false, error: 'No customer email' };
  }

  const ticket = await findTicket(ticketId, customerEmail);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  // Add customer email reply to messages
  const message = {
    id: `msg_hs_${thread.id || Date.now()}`,
    sender: 'user',
    senderName: thread.customer?.name || customerEmail,
    text: thread.body || '',
    timestamp: thread.createdAt || new Date().toISOString(),
    source: 'email',
    attachmentUrls: [],
  };

  const ticketRef = adminDb!.collection('users').doc(ticket.userId).collection('tickets').doc(ticket.ticketId);

  await ticketRef.update({
    messages: FieldValue.arrayUnion(message),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log('✅ Added customer email reply to ticket:', ticket.ticketId);
  return { success: true };
}

/**
 * Handle status change event
 */
async function handleStatusChange(data: any) {
  const conversation = data.conversation;

  if (!conversation) {
    console.error('❌ Missing conversation data');
    return { success: false, error: 'Invalid payload' };
  }

  const ticketId = extractTicketId(conversation.subject);
  const customerEmail = conversation.customer?.email;

  if (!customerEmail) {
    console.error('❌ No customer email in conversation');
    return { success: false, error: 'No customer email' };
  }

  const ticket = await findTicket(ticketId, customerEmail);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  const newStatus = mapStatus(conversation.status);
  const ticketRef = adminDb!.collection('users').doc(ticket.userId).collection('tickets').doc(ticket.ticketId);

  await ticketRef.update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log('✅ Updated ticket status:', ticket.ticketId, '→', newStatus);
  return { success: true };
}

/**
 * Handle assignment event
 */
async function handleAssignment(data: any) {
  const conversation = data.conversation;

  if (!conversation) {
    console.error('❌ Missing conversation data');
    return { success: false, error: 'Invalid payload' };
  }

  const ticketId = extractTicketId(conversation.subject);
  const customerEmail = conversation.customer?.email;

  if (!customerEmail) {
    console.error('❌ No customer email in conversation');
    return { success: false, error: 'No customer email' };
  }

  const ticket = await findTicket(ticketId, customerEmail);
  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  const assignedTo = conversation.assignee?.name || 'Unassigned';
  const ticketRef = adminDb!.collection('users').doc(ticket.userId).collection('tickets').doc(ticket.ticketId);

  await ticketRef.update({
    assignedAgentName: assignedTo,
    assignedAgentId: conversation.assignee?.id?.toString() || null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log('✅ Updated ticket assignment:', ticket.ticketId, '→', assignedTo);
  return { success: true };
}

/**
 * POST handler for Help Scout webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get('x-helpscout-signature');

    // Verify signature
    if (!verifySignature(bodyText, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse body
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      console.error('❌ Invalid JSON body');
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.log('📥 Help Scout webhook received:', body.event);

    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Handle different event types
    let result;
    switch (body.event) {
      case 'convo.agent.reply.created':
        result = await handleAgentReply(body);
        break;

      case 'convo.customer.reply.created':
        result = await handleCustomerReply(body);
        break;

      case 'convo.status':
        result = await handleStatusChange(body);
        break;

      case 'convo.assigned':
        result = await handleAssignment(body);
        break;

      default:
        console.log('ℹ️ Unhandled event type:', body.event);
        return NextResponse.json({ success: true, message: 'Event type not handled' });
    }

    if (!result.success) {
      console.error('❌ Handler failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook verification (Help Scout sends GET request to verify endpoint)
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Help Scout webhook endpoint is active' 
  });
}
