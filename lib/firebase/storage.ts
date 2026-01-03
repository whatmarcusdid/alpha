'use client';
import { app } from '@/lib/firebase';
import type { AttachmentFile } from '@/lib/firestore/support';

let storageFunctions: any = {};
let storage: any = null;

const MAX_FILE_SIZE_BYTES = 52428800; // 50 MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

if (typeof window !== 'undefined') {
  const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
  storage = getStorage(app);
  storageFunctions = {
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
  };
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File size cannot exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only PDF, PNG, and JPEG are allowed.' };
  }

  return { valid: true };
}

export async function uploadSupportAttachment(
  file: File,
  requestId: string
): Promise<{ success: boolean; attachment?: AttachmentFile; error?: string }> {

  if (typeof window === 'undefined' || !storageFunctions.storage) {
    const errorMsg = 'Storage functions not available. This must run in a browser environment.';
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const storagePath = `support_requests/${requestId}/${file.name}`;

  try {
    const storageRef = storageFunctions.ref(storageFunctions.storage, storagePath);
    const uploadResult = await storageFunctions.uploadBytes(storageRef, file);
    const downloadUrl = await storageFunctions.getDownloadURL(uploadResult.ref);

    const attachment: AttachmentFile = {
      name: file.name,
      size: file.size,
      contentType: file.type,
      storagePath: storagePath,
      downloadUrl: downloadUrl,
    };

    return { success: true, attachment };
  } catch (error) {
    console.error('Error uploading attachment to Firebase Storage:', error);
    return { success: false, error: 'Failed to upload file. Please try again.' };
  }
}

export { storage };
