/**
 * Sends the final Site Fix delivery email via Loops with the report PDF attached.
 * Uses LOOPS_SITE_FIX_DELIVERY_TEMPLATE_ID env var.
 */

const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';

export async function sendSiteFixDeliveryEmail(params: {
  recipientEmail: string;
  customerName: string;
  businessName: string;
  reportPdfBuffer: Buffer;
  reportId: string;
  loomUrl?: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_SITE_FIX_DELIVERY_TEMPLATE_ID;

  if (!apiKey) {
    throw new Error('LOOPS_API_KEY is not configured');
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    throw new Error('LOOPS_SITE_FIX_DELIVERY_TEMPLATE_ID is not configured');
  }

  const base64PdfData = params.reportPdfBuffer.toString('base64');

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.recipientEmail,
      dataVariables: {
        customerName: params.customerName || 'there',
        businessName: params.businessName,
        ...(params.loomUrl ? { loomUrl: params.loomUrl } : {}),
      },
      attachments: [
        {
          filename: 'site-fix-report.pdf',
          contentType: 'application/pdf',
          data: base64PdfData,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}
