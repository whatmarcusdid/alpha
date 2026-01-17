import { adminDb } from '@/lib/firebase/admin';
import type { SupportTicket } from '@/types/support';
import * as admin from 'firebase-admin';

/**
 * Creates an active support ticket for testing
 */
async function createActiveTicket(userId: string) {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const ticketsRef = adminDb.collection('supportTickets');
  
  const activeTicketData = {
    userId: userId,
    createdByUserId: userId,
    title: 'Plugin update causing site slowdown',
    description: 'After the recent WordPress plugin updates, my site has been loading much slower than usual. Pages that used to load in 2 seconds now take 5-6 seconds.',
    status: 'In Progress',
    priority: 'High',
    category: 'Bug Report',
    channel: 'Support Hub',
    
    // Jira fields (null for now)
    jsmIssueKey: null,
    jsmRequestTypeId: null,
    jsmStatus: null,
    jsmStatusCategory: null,
    lastSyncedAt: null,
    
    // Assignment
    assignedAgentId: 'agent-sarah',
    assignedAgentName: 'Sarah M.',
    
    // Timestamps
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    resolvedAt: null,
    closedAt: null,
    cancelledAt: null,
    
    // Optional
    attachments: [],
  };

  const docRef = await ticketsRef.add(activeTicketData);
  
  // Update with ticketId
  await docRef.update({ ticketId: docRef.id });
  
  console.log('✅ Active ticket created:', docRef.id);
  return docRef.id;
}

/**
 * Creates a past (resolved) support ticket for testing
 */
async function createPastTicket(userId: string) {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const ticketsRef = adminDb.collection('supportTickets');
  
  // Create timestamp for 2 days ago
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  const pastTicketData = {
    userId: userId,
    createdByUserId: userId,
    title: 'Cannot update billing address',
    description: 'I am trying to update my billing address in the account settings but the form is not saving my changes. I have tried multiple times.',
    status: 'Resolved',
    priority: 'Medium',
    category: 'Updates',
    channel: 'Support Hub',
    
    // Jira fields
    jsmIssueKey: 'TSG-1033',
    jsmRequestTypeId: null,
    jsmStatus: 'Done',
    jsmStatusCategory: 'Done',
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Assignment
    assignedAgentId: 'agent-sarah',
    assignedAgentName: 'Sarah M.',
    
    // Timestamps
    createdAt: admin.firestore.Timestamp.fromDate(twoDaysAgo),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    closedAt: null,
    cancelledAt: null,
    
    // Optional
    attachments: [],
  };

  const docRef = await ticketsRef.add(pastTicketData);
  
  // Update with ticketId
  await docRef.update({ ticketId: docRef.id });
  
  console.log('✅ Past ticket created:', docRef.id);
  return docRef.id;
}

/**
 * Main execution function
 */
async function main() {
  // Get userId from command line argument
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Error: Please provide a user ID');
    console.log('Usage: tsx scripts/create-test-tickets.ts YOUR_USER_ID');
    process.exit(1);
  }
  
  console.log('🚀 Creating test support tickets...');
  console.log('📝 User ID:', userId);
  console.log('');
  
  try {
    const activeTicketId = await createActiveTicket(userId);
    const pastTicketId = await createPastTicket(userId);
    
    console.log('');
    console.log('✅ All test tickets created successfully!');
    console.log('');
    console.log('Created tickets:');
    console.log('  - Active:', activeTicketId);
    console.log('  - Past:', pastTicketId);
    console.log('');
    console.log('👉 Go to your Support Hub to see them!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tickets:', error);
    process.exit(1);
  }
}

main();
