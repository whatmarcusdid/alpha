'use client';
import { db } from '@/lib/firebase';
import type {
  SupportTicket,
  CreateTicketInput,
  UpdateTicketStatusInput,
  TicketStatus,
} from '@/types/support';

// ============================================================================
// BROWSER-ONLY FIREBASE INITIALIZATION
// ============================================================================

let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    orderBy,
    updateDoc,
    serverTimestamp,
    Timestamp,
  } = require('firebase/firestore');

  firestoreFunctions = {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    orderBy,
    updateDoc,
    serverTimestamp,
    Timestamp,
  };
}

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

/**
 * Convert Firestore Timestamp to Date object
 */
function convertTimestampToDate(timestamp: any): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return undefined;
}

/**
 * Convert ticket data from Firestore format to SupportTicket type
 */
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

/**
 * Create a new support ticket
 */
export async function createSupportTicket(
  input: CreateTicketInput
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  if (typeof window === 'undefined' || !db) {
    const errorMsg = 'Firestore not initialized. This must run in a browser environment.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const ticketsRef = firestoreFunctions.collection(db, 'supportTickets');

    const ticketData = {
      // Required fields from input
      userId: input.userId,
      createdByUserId: input.createdByUserId,
      title: input.title,
      description: input.description,
      category: input.category,
      channel: input.channel,

      // Default values
      status: 'Open' as TicketStatus,
      priority: input.priority || 'Medium',

      // Jira fields (initially null)
      jsmIssueKey: null,
      jsmRequestTypeId: null,
      jsmStatus: null,
      jsmStatusCategory: null,
      lastSyncedAt: null,

      // Assignment (initially unassigned)
      assignedAgentId: null,
      assignedAgentName: null,

      // Timestamps
      createdAt: firestoreFunctions.serverTimestamp(),
      lastUpdatedAt: firestoreFunctions.serverTimestamp(),
      resolvedAt: null,
      closedAt: null,
      cancelledAt: null,

      // Optional fields
      satisfactionRating: null,
      attachments: input.attachments || [],
      customerEmail: input.customerEmail || null,
      customerName: input.customerName || null,
      internalNotes: null,
    };

    const docRef = await firestoreFunctions.addDoc(ticketsRef, ticketData);

    console.log('Support ticket created successfully:', docRef.id);
    return { success: true, ticketId: docRef.id };
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return { success: false, error: 'Failed to create support ticket. Please try again.' };
  }
}

/**
 * Get active tickets for a user
 */
export async function getActiveTickets(
  userId: string
): Promise<{ success: boolean; tickets?: SupportTicket[]; error?: string }> {
  if (typeof window === 'undefined' || !db) {
    const errorMsg = 'Firestore not initialized. This must run in a browser environment.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const ticketsRef = firestoreFunctions.collection(db, 'supportTickets');
    const q = firestoreFunctions.query(
      ticketsRef,
      firestoreFunctions.where('userId', '==', userId),
      firestoreFunctions.where('status', 'in', ['Open', 'In Progress', 'Awaiting Customer']),
      firestoreFunctions.orderBy('lastUpdatedAt', 'desc')
    );

    const querySnapshot = await firestoreFunctions.getDocs(q);
    const tickets: SupportTicket[] = [];

    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      tickets.push(convertTicketData(doc.id, data));
    });

    console.log(`Retrieved ${tickets.length} active tickets for user ${userId}`);
    return { success: true, tickets };
  } catch (error) {
    console.error('Error fetching active tickets:', error);
    return { success: false, error: 'Failed to fetch active tickets.' };
  }
}

/**
 * Get past (resolved/closed/cancelled) tickets for a user
 */
export async function getPastTickets(
  userId: string
): Promise<{ success: boolean; tickets?: SupportTicket[]; error?: string }> {
  if (typeof window === 'undefined' || !db) {
    const errorMsg = 'Firestore not initialized. This must run in a browser environment.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const ticketsRef = firestoreFunctions.collection(db, 'supportTickets');
    const q = firestoreFunctions.query(
      ticketsRef,
      firestoreFunctions.where('userId', '==', userId),
      firestoreFunctions.where('status', 'in', ['Resolved', 'Closed', 'Cancelled']),
      firestoreFunctions.orderBy('createdAt', 'desc')
    );

    const querySnapshot = await firestoreFunctions.getDocs(q);
    const tickets: SupportTicket[] = [];

    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      tickets.push(convertTicketData(doc.id, data));
    });

    console.log(`Retrieved ${tickets.length} past tickets for user ${userId}`);
    return { success: true, tickets };
  } catch (error) {
    console.error('Error fetching past tickets:', error);
    return { success: false, error: 'Failed to fetch past tickets.' };
  }
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(
  ticketId: string
): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> {
  if (typeof window === 'undefined' || !db) {
    const errorMsg = 'Firestore not initialized. This must run in a browser environment.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const ticketRef = firestoreFunctions.doc(db, 'supportTickets', ticketId);
    const ticketDoc = await firestoreFunctions.getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      console.warn(`Ticket not found: ${ticketId}`);
      return { success: false, error: 'Ticket not found.' };
    }

    const data = ticketDoc.data();
    const ticket = convertTicketData(ticketDoc.id, data);

    console.log(`Retrieved ticket: ${ticketId}`);
    return { success: true, ticket };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return { success: false, error: 'Failed to fetch ticket.' };
  }
}

/**
 * Update ticket status and related fields
 */
export async function updateTicketStatus(
  ticketId: string,
  updates: UpdateTicketStatusInput & {
    assignedAgentId?: string;
    assignedAgentName?: string;
    jsmIssueKey?: string;
    jsmRequestTypeId?: string;
    jsmStatus?: string;
    jsmStatusCategory?: 'To Do' | 'In Progress' | 'Done';
  }
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined' || !db) {
    const errorMsg = 'Firestore not initialized. This must run in a browser environment.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const ticketRef = firestoreFunctions.doc(db, 'supportTickets', ticketId);

    // Build update object
    const updateData: any = {
      status: updates.newStatus,
      lastUpdatedAt: firestoreFunctions.serverTimestamp(),
    };

    // Auto-set timestamp fields based on status
    if (updates.newStatus === 'Resolved' && !updates.notes) {
      updateData.resolvedAt = firestoreFunctions.serverTimestamp();
    }

    if (updates.newStatus === 'Closed') {
      updateData.closedAt = firestoreFunctions.serverTimestamp();
    }

    if (updates.newStatus === 'Cancelled') {
      updateData.cancelledAt = firestoreFunctions.serverTimestamp();
    }

    // Update assignment if provided
    if (updates.assignedAgentId !== undefined) {
      updateData.assignedAgentId = updates.assignedAgentId;
    }

    if (updates.assignedAgentName !== undefined) {
      updateData.assignedAgentName = updates.assignedAgentName;
    }

    // Update Jira fields if provided
    if (updates.jsmIssueKey !== undefined) {
      updateData.jsmIssueKey = updates.jsmIssueKey;
    }

    if (updates.jsmRequestTypeId !== undefined) {
      updateData.jsmRequestTypeId = updates.jsmRequestTypeId;
    }

    if (updates.jsmStatus !== undefined) {
      updateData.jsmStatus = updates.jsmStatus;
    }

    if (updates.jsmStatusCategory !== undefined) {
      updateData.jsmStatusCategory = updates.jsmStatusCategory;
    }

    if (updates.jsmIssueKey || updates.jsmStatus) {
      updateData.lastSyncedAt = firestoreFunctions.serverTimestamp();
    }

    // Add internal notes if provided
    if (updates.notes) {
      updateData.internalNotes = updates.notes;
    }

    await firestoreFunctions.updateDoc(ticketRef, updateData);

    console.log(`Ticket ${ticketId} updated successfully to status: ${updates.newStatus}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return { success: false, error: 'Failed to update ticket status.' };
  }
}

/**
 * Calculate resolution time in hours for a ticket
 */
export function calculateResolutionTime(ticket: SupportTicket): number | null {
  if (!ticket.createdAt) {
    return null;
  }

  // Determine end time (resolved or closed)
  let endTime: Date | undefined;
  if (ticket.resolvedAt) {
    endTime = convertTimestampToDate(ticket.resolvedAt);
  } else if (ticket.closedAt) {
    endTime = convertTimestampToDate(ticket.closedAt);
  }

  if (!endTime) {
    return null;
  }

  const startTime = convertTimestampToDate(ticket.createdAt);
  if (!startTime) {
    return null;
  }

  // Calculate difference in milliseconds
  const diffMs = endTime.getTime() - startTime.getTime();
  
  // Convert to hours and round to 1 decimal place
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
}

/**
 * Format resolution time in a human-readable format
 */
export function formatResolutionTime(hours: number | null): string {
  if (hours === null) {
    return '—';
  }

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }

  if (hours < 24) {
    const roundedHours = Math.round(hours * 10) / 10;
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
  }

  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

// ============================================================================
// LEGACY SUPPORT (for backwards compatibility)
// ============================================================================

export interface SupportRequest {
  requestFromEmail: string;
  userId: string;
  description: string;
  attachmentFiles: AttachmentFile[];
  createdAt: any;
  status: 'new' | 'open' | 'closed';
}

export async function submitSupportRequest(
  userId: string,
  requestFromEmail: string,
  description: string,
  attachmentFiles: AttachmentFile[]
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return { success: false, error: 'Firestore not initialized' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(requestFromEmail)) {
    return { success: false, error: 'Invalid email format' };
  }

  // Validate description
  if (!description || description.trim().length === 0) {
    return { success: false, error: 'Description is required' };
  }

  try {
    const supportRequestsRef = firestoreFunctions.collection(db, 'support_requests');
    
    const docRef = await firestoreFunctions.addDoc(supportRequestsRef, {
      requestFromEmail,
      userId,
      description: description.trim(),
      attachmentFiles,
      createdAt: firestoreFunctions.serverTimestamp(),
      status: 'new'
    });

    return { success: true, requestId: docRef.id };
  } catch (error) {
    console.error('Error submitting support request:', error);
    return { success: false, error: 'Failed to submit support request' };
  }
}
