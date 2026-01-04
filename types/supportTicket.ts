import { Timestamp } from 'firebase/firestore';

export interface SupportTicket {
  id: string;
  userId: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature-request' | 'general';
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  
  // User Info (denormalized for easy admin view)
  requestFrom: string;  // User's email
  userFullName: string;
  
  // Assignment
  assignedTo?: string;  // Admin user ID
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  
  // Metadata
  source: 'dashboard' | 'email' | 'phone';
  userAgent?: string;
}
