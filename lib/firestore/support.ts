'use client';

import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import type {
  SupportTicket,
  CreateTicketInput,
  UpdateTicketStatusInput,
  TicketStatus,
} from '@/types/support';

// ============================================================================
// TYPES FOR ATTACHMENTS
// ============================================================================

export interface AttachmentFile {
  name: string;
  size: number;
  contentType: string;
  storagePath: string;
  downloadUrl?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function convertTicketData(ticketId: string, data: any): SupportTicket {
  return {
    ticketId,
    userId: data.userId,
    createdByUserId: data.createdByUserId,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    category: data.category,
    channel: data.channel,
    jsmIssueKey: data.jsmIssueKey || undefined,
    jsmRequestTypeId: data.jsmRequestTypeId || undefined,
    jsmStatus: data.jsmStatus || undefined,
    jsmStatusCategory: data.jsmStatusCategory || undefined,
    lastSyncedAt: data.lastSyncedAt || undefined,
    assignedAgentId: data.assignedAgentId || undefined,
    assignedAgentName: data.assignedAgentName || undefined,
    createdAt: data.createdAt,
    lastUpdatedAt: data.lastUpdatedAt,
    resolvedAt: data.resolvedAt || undefined,
    closedAt: data.closedAt || undefined,
    cancelledAt: data.cancelledAt || undefined,
    satisfactionRating: data.satisfactionRating || undefined,
    attachments: data.attachments || undefined,
    customerEmail: data.customerEmail || undefined,
    customerName: data.customerName || undefined,
    internalNotes: data.internalNotes || undefined,
  };
}

// ============================================================================
// FIRESTORE FUNCTIONS
// ============================================================================

export async function getActiveTickets(
  userId: string
): Promise<{ success: boolean; tickets?: SupportTicket[]; error?: string }> {
  if (!db) {
    console.error('Firestore db is not initialized');
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(
      ticketsRef,
      where('userId', '==', userId),
      where('status', 'in', ['Open', 'In Progress', 'Awaiting Customer']),
      orderBy('lastUpdatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tickets: SupportTicket[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      tickets.push(convertTicketData(docSnap.id, data));
    });

    console.log(`Retrieved ${tickets.length} active tickets`);
    return { success: true, tickets };
  } catch (error: any) {
    console.error('Error fetching active tickets:', error);
    return { success: false, error: error.message || 'Failed to fetch active tickets.' };
  }
}

export async function getPastTickets(
  userId: string
): Promise<{ success: boolean; tickets?: SupportTicket[]; error?: string }> {
  if (!db) {
    console.error('Firestore db is not initialized');
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(
      ticketsRef,
      where('userId', '==', userId),
      where('status', 'in', ['Resolved', 'Closed', 'Cancelled']),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tickets: SupportTicket[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      tickets.push(convertTicketData(docSnap.id, data));
    });

    console.log(`Retrieved ${tickets.length} past tickets`);
    return { success: true, tickets };
  } catch (error: any) {
    console.error('Error fetching past tickets:', error);
    return { success: false, error: error.message || 'Failed to fetch past tickets.' };
  }
}

export async function getTicketById(
  ticketId: string
): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return { success: false, error: 'Ticket not found.' };
    }

    const data = ticketDoc.data();
    const ticket = convertTicketData(ticketDoc.id, data);

    return { success: true, ticket };
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return { success: false, error: error.message || 'Failed to fetch ticket.' };
  }
}

export async function createSupportTicket(
  input: CreateTicketInput
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    const ticketsRef = collection(db, 'supportTickets');

    const ticketData = {
      userId: input.userId,
      createdByUserId: input.createdByUserId,
      title: input.title,
      description: input.description,
      category: input.category,
      channel: input.channel,
      status: 'Open' as TicketStatus,
      priority: input.priority || 'Medium',
      jsmIssueKey: null,
      jsmRequestTypeId: null,
      jsmStatus: null,
      jsmStatusCategory: null,
      lastSyncedAt: null,
      assignedAgentId: null,
      assignedAgentName: null,
      createdAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
      resolvedAt: null,
      closedAt: null,
      cancelledAt: null,
      satisfactionRating: null,
      attachments: input.attachments || [],
      customerEmail: input.customerEmail || null,
      customerName: input.customerName || null,
      internalNotes: null,
    };

    const docRef = await addDoc(ticketsRef, ticketData);
    console.log('✅ Support ticket created:', docRef.id);
    return { success: true, ticketId: docRef.id };
  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return { success: false, error: error.message || 'Failed to create support ticket.' };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  updates: UpdateTicketStatusInput
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized.' };
  }

  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);

    const updateData: any = {
      status: updates.newStatus,
      lastUpdatedAt: serverTimestamp(),
    };

    if (updates.newStatus === 'Resolved') {
      updateData.resolvedAt = serverTimestamp();
    }
    if (updates.newStatus === 'Closed') {
      updateData.closedAt = serverTimestamp();
    }
    if (updates.newStatus === 'Cancelled') {
      updateData.cancelledAt = serverTimestamp();
    }
    if (updates.notes) {
      updateData.internalNotes = updates.notes;
    }

    await updateDoc(ticketRef, updateData);
    console.log(`✅ Ticket ${ticketId} updated to: ${updates.newStatus}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating ticket status:', error);
    return { success: false, error: error.message || 'Failed to update ticket status.' };
  }
}
