'use client';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
    const supportRequestsRef = collection(db, 'support_requests');
    
    const docRef = await addDoc(supportRequestsRef, {
      requestFromEmail,
      userId,
      description: description.trim(),
      attachmentFiles,
      createdAt: serverTimestamp(),
      status: 'new'
    });

    return { success: true, requestId: docRef.id };
  } catch (error) {
    console.error('Error submitting support request:', error);
    return { success: false, error: 'Failed to submit support request' };
  }
}
