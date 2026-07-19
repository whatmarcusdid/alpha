import * as admin from 'firebase-admin';

export function getBucket() {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error('Firebase Storage bucket is not configured');
  }

  return admin.storage().bucket(bucketName);
}

function reportStoragePath(uid: string, sessionId: string, reportId: string): string {
  return `reports/${uid}/${sessionId}/${reportId}.pdf`;
}

export async function uploadReportPDF(
  uid: string,
  sessionId: string,
  reportId: string,
  pdfBuffer: Buffer
): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(reportStoragePath(uid, sessionId, reportId));

  await file.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0',
    },
    predefinedAcl: undefined,
    public: false,
  });
}

export async function getReportDownloadStream(
  uid: string,
  sessionId: string,
  reportId: string
): Promise<NodeJS.ReadableStream> {
  const bucket = getBucket();
  const file = bucket.file(reportStoragePath(uid, sessionId, reportId));
  const [exists] = await file.exists();

  if (!exists) {
    throw new Error('REPORT_NOT_FOUND');
  }

  return file.createReadStream();
}

export { reportStoragePath };
