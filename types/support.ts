import { Timestamp } from 'firebase/firestore';
import type { AttachmentFile } from '@/lib/firestore/support';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type TicketStatus = 
  | 'Open'
  | 'In Progress'
  | 'Awaiting Customer'
  | 'Resolved'
  | 'Closed'
  | 'Cancelled';

export type TicketPriority = 
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low';

export type TicketChannel = 
  | 'Support Hub'
  | 'Email'
  | 'Phone'
  | 'Chat';

export type TicketCategory = 
  | 'Updates'
  | 'Bug Report'
  | 'Question'
  | 'Feature Request'
  | 'Other';

// Active statuses (ticket is still being worked on)
export const ACTIVE_STATUSES: TicketStatus[] = [
  'Open',
  'In Progress',
  'Awaiting Customer',
];

// Terminal statuses (ticket is no longer active)
export const TERMINAL_STATUSES: TicketStatus[] = [
  'Resolved',
  'Closed',
  'Cancelled',
];

// Status color mapping for UI display
export const STATUS_COLORS: Record<
  TicketStatus,
  { bg: string; text: string }
> = {
  'Open': {
    bg: '#E5E7EB',
    text: '#374151',
  },
  'In Progress': {
    bg: '#D1FAE5',
    text: '#065F46',
  },
  'Awaiting Customer': {
    bg: '#FEF3C7',
    text: '#92400E',
  },
  'Resolved': {
    bg: '#D1FAE5',
    text: '#065F46',
  },
  'Closed': {
    bg: '#E5E7EB',
    text: '#374151',
  },
  'Cancelled': {
    bg: '#FEE2E2',
    text: '#991B1B',
  },
};

// ============================================================================
// MAIN INTERFACES
// ============================================================================

export interface SupportTicket {
  // Core Identification
  ticketId: string;
  userId: string;
  createdByUserId: string;

  // Ticket Content
  title: string;
  description: string;

  // Classification
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  channel: TicketChannel;

  // Jira Service Management Integration
  jsmIssueKey?: string; // e.g., "TSG-123"
  jsmRequestTypeId?: string;
  jsmStatus?: string; // JSM's internal status name
  jsmStatusCategory?: 'To Do' | 'In Progress' | 'Done';
  lastSyncedAt?: Timestamp;

  // Assignment
  assignedAgentId?: string;
  assignedAgentName?: string;

  // Timestamps
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  resolvedAt?: Timestamp;
  closedAt?: Timestamp;
  cancelledAt?: Timestamp;

  // Optional Fields
  satisfactionRating?: 1 | 2 | 3 | 4 | 5;
  attachments?: AttachmentFile[];

  // Customer Information (denormalized for easy access)
  customerEmail?: string;
  customerName?: string;

  // Internal Notes (not visible to customer)
  internalNotes?: string;

  // Conversation Messages (added at runtime from Firestore)
  messages?: Array<{
    id: string;
    sender: 'user' | 'support';
    senderName: string;
    senderEmail?: string;
    text: string;
    timestamp: string;
    source?: 'dashboard' | 'email' | 'helpscout';
    attachmentUrls?: string[];
  }>;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Input type for creating a new support ticket
 */
export interface CreateTicketInput {
  // Required fields
  userId: string;
  createdByUserId: string;
  title: string;
  description: string;
  category: TicketCategory;
  channel: TicketChannel;

  // Optional fields
  priority?: TicketPriority;
  attachments?: AttachmentFile[];
  customerEmail?: string;
  customerName?: string;
}

/**
 * Input type for updating ticket status
 */
export interface UpdateTicketStatusInput {
  ticketId: string;
  newStatus: TicketStatus;
  updatedBy: string; // User ID of person making the update
  notes?: string; // Optional notes about the status change
}

/**
 * Input type for assigning a ticket to an agent
 */
export interface AssignTicketInput {
  ticketId: string;
  assignedAgentId: string;
  assignedAgentName: string;
  assignedBy: string; // User ID of person making the assignment
}

/**
 * Input type for adding internal notes
 */
export interface AddTicketNoteInput {
  ticketId: string;
  note: string;
  addedBy: string; // User ID of person adding the note
}

/**
 * Input type for submitting satisfaction rating
 */
export interface SubmitRatingInput {
  ticketId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type for ticket filters in list views
 */
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  channel?: TicketChannel[];
  assignedAgentId?: string;
  userId?: string;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Type for ticket sorting options
 */
export type TicketSortField = 
  | 'createdAt'
  | 'lastUpdatedAt'
  | 'priority'
  | 'status'
  | 'ticketId';

export type TicketSortOrder = 'asc' | 'desc';

export interface TicketSortOptions {
  field: TicketSortField;
  order: TicketSortOrder;
}

/**
 * Type for ticket statistics
 */
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  awaitingCustomer: number;
  resolved: number;
  closed: number;
  cancelled: number;
  averageResolutionTime?: number; // in hours
  satisfactionScore?: number; // average rating
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a ticket status is active (not terminal)
 */
export function isActiveStatus(status: TicketStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check if a ticket status is terminal (completed/closed)
 */
export function isTerminalStatus(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Get status colors for a given status
 */
export function getStatusColors(status: TicketStatus): { bg: string; text: string } {
  return STATUS_COLORS[status];
}

/**
 * Generate a human-readable ticket ID
 */
export function generateTicketId(firestoreId: string): string {
  // Convert Firestore ID to a shorter, more readable format
  const shortId = firestoreId.substring(0, 8).toUpperCase();
  return `TSG-${shortId}`;
}
