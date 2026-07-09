import { captureException } from '@sentry/nextjs';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { sendSiteFixDeliveryEmail } from '@/lib/book-service/deliveryEmail';
import { adminDb } from '@/lib/firebase/admin';
import { getReportDownloadStream } from '@/lib/storage/adminStorage';
import { streamToBuffer } from '@/lib/storage/streamToBuffer';
import type { FixSessionDoc } from '@/lib/types/fix-session';

export type DeliverSiteFixError = {
  status: 400 | 404 | 409 | 500;
  error: string;
};

export type DeliverSiteFixSuccess = {
  sentAt: string;
  warning?: string;
};

export function buildDeliverableFields(
  sessionId: string,
  loomUrl?: string
): {
  reportUrl: string;
  deliveryStatus: 'delivered';
  loomUrl?: string;
} {
  const reportUrl = `/api/dashboard/report-download?sessionId=${sessionId}`;

  return {
    reportUrl,
    deliveryStatus: 'delivered',
    ...(loomUrl ? { loomUrl } : {}),
  };
}

export function validateDeliverPreconditions(
  session: FixSessionDoc
): DeliverSiteFixError | null {
  if (session.stage !== 'report_ready') {
    return { status: 409, error: 'Job is not in report_ready stage' };
  }

  if (session.report?.status !== 'generated') {
    if (session.report?.status === 'sent') {
      return { status: 409, error: 'Already delivered' };
    }

    return { status: 409, error: 'Generate the report first' };
  }

  if (!session.report.reportId) {
    return { status: 409, error: 'Generate the report first' };
  }

  return null;
}

function resolveRecipientEmail(userData: Record<string, unknown>): string | null {
  if (typeof userData.email !== 'string') {
    return null;
  }

  const normalized = userData.email.toLowerCase().trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveCustomerName(userData: Record<string, unknown>): string {
  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  if (typeof userData.fullName === 'string' && userData.fullName.trim().length > 0) {
    return userData.fullName.trim();
  }

  if (typeof company?.legalName === 'string' && company.legalName.trim().length > 0) {
    return company.legalName.trim();
  }

  return 'there';
}

function resolveBusinessName(userData: Record<string, unknown>): string {
  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  if (typeof company?.legalName === 'string' && company.legalName.trim().length > 0) {
    return company.legalName.trim();
  }

  return resolveCustomerName(userData);
}

export async function deliverSiteFix(params: {
  uid: string;
  sessionId: string;
  adminUid: string;
  loomUrl?: string;
}): Promise<DeliverSiteFixSuccess | DeliverSiteFixError> {
  if (!adminDb) {
    return { status: 400, error: 'Server configuration error' };
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(params.uid)
    .collection('fixSessions')
    .doc(params.sessionId);

  const userRef = adminDb.collection('users').doc(params.uid);

  const [sessionSnap, userSnap] = await Promise.all([sessionRef.get(), userRef.get()]);

  if (!sessionSnap.exists) {
    return { status: 404, error: 'Fix job not found' };
  }

  if (!userSnap.exists) {
    return { status: 404, error: 'Customer not found' };
  }

  const session = sessionSnap.data() as FixSessionDoc;
  const userData = userSnap.data() as Record<string, unknown>;

  const preconditionError = validateDeliverPreconditions(session);
  if (preconditionError) {
    return preconditionError;
  }

  const recipientEmail = resolveRecipientEmail(userData);
  if (!recipientEmail) {
    return { status: 404, error: 'Customer email not found' };
  }

  const reportId = session.report!.reportId!;

  await sessionRef.update({
    deliveryAttemptAt: FieldValue.serverTimestamp(),
  });

  let pdfBuffer: Buffer;
  try {
    const pdfStream = await getReportDownloadStream(params.uid, params.sessionId, reportId);
    pdfBuffer = await streamToBuffer(pdfStream);
  } catch (error) {
    console.error('Failed to fetch report PDF for delivery:', error);
    return { status: 500, error: 'Failed to load report PDF' };
  }

  try {
    await sendSiteFixDeliveryEmail({
      recipientEmail,
      customerName: resolveCustomerName(userData),
      businessName: resolveBusinessName(userData),
      reportPdfBuffer: pdfBuffer,
      reportId,
      loomUrl: params.loomUrl,
    });
  } catch (error) {
    console.error('Loops delivery email failed:', error);
    return { status: 500, error: 'Failed to send delivery email' };
  }

  const sentAt = Timestamp.now();
  const deliverableFields = buildDeliverableFields(params.sessionId, params.loomUrl);

  try {
    await adminDb.runTransaction(async (transaction) => {
      await transaction.update(sessionRef, {
        'report.status': 'sent',
        'report.sentAt': sentAt,
        stage: 'delivered',
        stageHistory: FieldValue.arrayUnion({
          stage: 'delivered',
          at: sentAt,
          by: params.adminUid,
        }),
        ...deliverableFields,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (writeErr) {
    captureException(writeErr, {
      extra: {
        fixJobId: params.sessionId,
        uid: params.uid,
        reportId,
        context: 'post-delivery-firestore-write',
      },
    });
    console.error('Delivery email sent but Firestore write failed:', writeErr);

    return {
      sentAt: sentAt.toDate().toISOString(),
      warning: 'Email sent but status update failed — check Sentry',
    };
  }

  return {
    sentAt: sentAt.toDate().toISOString(),
  };
}
