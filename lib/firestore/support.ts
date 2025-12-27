import { db } from '@/lib/firebase';

let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
  firestoreFunctions = { collection, addDoc, serverTimestamp };
}

export interface AttachmentFile {
  name: string;
  size: number;
  contentType: string;
  storagePath: string;
  downloadUrl?: string;
}

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
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot submit on server side' };
  }

  if (!db) {
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