import { describe, expect, it, vi } from 'vitest';

const save = vi.fn(async () => undefined);
const getSignedUrl = vi.fn(async () => ['https://signed.example/audit.pdf']);

vi.mock('@/lib/storage/adminStorage', () => ({
  getBucket: () => ({
    file: (path: string) => ({
      path,
      save,
      getSignedUrl,
    }),
  }),
}));

import {
  auditReportStoragePath,
  getSignedAuditPdfUrl,
  uploadAuditReportPdf,
} from '@/lib/storage/uploadAuditReportPdf';

describe('uploadAuditReportPdf', () => {
  it('uses private auditLeads path convention', () => {
    expect(auditReportStoragePath('lead_abc123')).toBe(
      'auditLeads/lead_abc123/report.pdf'
    );
  });

  it('uploads a private PDF and returns the storage path', async () => {
    const buffer = Buffer.from('pdf-bytes');

    const storagePath = await uploadAuditReportPdf('lead_abc123', buffer);

    expect(storagePath).toBe('auditLeads/lead_abc123/report.pdf');
    expect(save).toHaveBeenCalledWith(buffer, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'private, max-age=0',
      },
      predefinedAcl: undefined,
      public: false,
    });
  });

  it('getSignedAuditPdfUrl returns a signed read URL', async () => {
    const url = await getSignedAuditPdfUrl('auditLeads/lead_abc123/report.pdf');

    expect(url).toBe('https://signed.example/audit.pdf');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'read',
        expires: expect.any(Number),
      })
    );
  });
});
