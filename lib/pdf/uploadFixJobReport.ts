import * as admin from 'firebase-admin';

export type UploadReportResult = {
  storagePath: string;
  previewUrl: string;
  fileSizeBytes: number;
};

function getBucket() {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error('Firebase Storage bucket is not configured');
  }

  return admin.storage().bucket(bucketName);
}

/**
 * Uploads a fix job PDF to Firebase Storage and returns a long-lived signed read URL.
 */
export async function uploadFixJobReportPdf(
  fixJobId: string,
  reportId: string,
  buffer: Buffer
): Promise<UploadReportResult> {
  const storagePath = `fixJobs/${fixJobId}/reports/${reportId}.pdf`;
  const bucket = getBucket();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=31536000',
    },
  });

  const expires = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
  const [previewUrl] = await file.getSignedUrl({
    action: 'read',
    expires,
  });

  return {
    storagePath,
    previewUrl,
    fileSizeBytes: buffer.length,
  };
}
