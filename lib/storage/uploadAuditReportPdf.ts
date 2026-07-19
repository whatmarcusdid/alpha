import { getBucket } from '@/lib/storage/adminStorage';

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function auditReportStoragePath(auditLeadId: string): string {
  return `auditLeads/${auditLeadId}/report.pdf`;
}

/**
 * Uploads a private audit PDF to Storage and returns its path.
 *
 * Deliberately path-only — unlike `uploadFixJobReportPdf`, we do not generate
 * a long-lived signed URL at upload time. Download/Loops tickets mint
 * short-lived URLs on demand via `getSignedAuditPdfUrl`.
 */
export async function uploadAuditReportPdf(
  auditLeadId: string,
  pdfBuffer: Buffer
): Promise<string> {
  const storagePath = auditReportStoragePath(auditLeadId);
  const bucket = getBucket();
  const file = bucket.file(storagePath);

  await file.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=0',
    },
    predefinedAcl: undefined,
    public: false,
  });

  return storagePath;
}

/** Returns a 7-day read URL for a stored audit PDF. Not used at upload time. */
export async function getSignedAuditPdfUrl(storagePath: string): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return url;
}
