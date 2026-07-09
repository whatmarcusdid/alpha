import { diffAuditSnapshots } from '@/lib/audit/diffAuditSnapshots';
import { buildCompletedSignals } from '@/lib/fix-jobs/build-completed-signals';
import { derivePackageName } from '@/lib/fix-jobs/derive-package-name';
import { parseEntitlementsFromSiteFix } from '@/lib/fix-jobs/job-detail-utils';
import { validateDeliveryNote } from '@/lib/fix-jobs/validate-delivery-note';
import { generateSiteFixPDF } from '@/lib/pdf/generateSiteFixPDF';
import type { SiteFixReportProps } from '@/lib/pdf/SiteFixReportDocument';
import { uploadReportPDF } from '@/lib/storage/adminStorage';
import { SUPPORT_EMAIL } from '@/lib/config';
import { adminDb } from '@/lib/firebase/admin';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixSessionDoc } from '@/lib/types/fix-session';
import { FieldValue } from 'firebase-admin/firestore';

export type GenerateSiteFixReportError = {
  status: 400 | 404 | 409;
  error: string;
};

export type GenerateSiteFixReportSuccess = {
  reportId: string;
};

export function buildSiteFixReportProps(params: {
  session: FixSessionDoc;
  auditLead: AuditLeadDoc;
  userData: Record<string, unknown>;
  entitlements: ReturnType<typeof parseEntitlementsFromSiteFix>;
  deliveryNote?: string;
}): SiteFixReportProps {
  const { session, auditLead, userData, entitlements, deliveryNote } = params;

  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  const customerName =
    typeof userData.fullName === 'string' && userData.fullName.trim().length > 0
      ? userData.fullName.trim()
      : typeof company?.legalName === 'string' && company.legalName.trim().length > 0
        ? company.legalName.trim()
        : auditLead.businessName;

  const businessName =
    typeof company?.legalName === 'string' && company.legalName.trim().length > 0
      ? company.legalName.trim()
      : auditLead.businessName;

  const after = session.afterAudit ?? {};
  const diff = diffAuditSnapshots(auditLead, after, entitlements);

  return {
    customerName,
    businessName,
    siteUrl: auditLead.websiteUrl,
    deliveryDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    packageName: derivePackageName(entitlements),
    entitlements,
    diff,
    completedSignals: buildCompletedSignals(session, entitlements),
    deliveryNote: deliveryNote?.trim() || undefined,
    supportEmail: SUPPORT_EMAIL,
  };
}

export async function generateSiteFixReport(params: {
  uid: string;
  sessionId: string;
  deliveryNote?: string;
}): Promise<GenerateSiteFixReportSuccess | GenerateSiteFixReportError> {
  if (!adminDb) {
    return { status: 400, error: 'Server configuration error' };
  }

  const noteError = validateDeliveryNote(params.deliveryNote);
  if (noteError) {
    return noteError;
  }

  const sessionRef = adminDb
    .collection('users')
    .doc(params.uid)
    .collection('fixSessions')
    .doc(params.sessionId);

  const [sessionSnap, userSnap] = await Promise.all([
    sessionRef.get(),
    adminDb.collection('users').doc(params.uid).get(),
  ]);

  if (!sessionSnap.exists) {
    return { status: 404, error: 'Fix job not found' };
  }

  const session = sessionSnap.data() as FixSessionDoc;

  if (session.stage !== 'report_ready') {
    return { status: 409, error: 'Job is not in report_ready stage' };
  }

  if (session.report?.status === 'sent') {
    return { status: 409, error: 'Cannot regenerate: report has already been sent' };
  }

  const auditLeadId = session.auditLeadId;
  if (!auditLeadId) {
    return { status: 404, error: 'Audit lead not found' };
  }

  const auditSnap = await adminDb.collection('auditLeads').doc(auditLeadId).get();
  if (!auditSnap.exists) {
    return { status: 404, error: 'Audit lead not found' };
  }

  const auditLead = auditSnap.data() as AuditLeadDoc;
  const userData = userSnap.exists
    ? (userSnap.data() as Record<string, unknown>)
    : {};

  const siteFix =
    userData.siteFix && typeof userData.siteFix === 'object'
      ? (userData.siteFix as Record<string, unknown>)
      : undefined;

  const entitlements = parseEntitlementsFromSiteFix(siteFix);
  const trimmedNote = params.deliveryNote?.trim() || undefined;

  const reportProps = buildSiteFixReportProps({
    session,
    auditLead,
    userData,
    entitlements,
    deliveryNote: trimmedNote,
  });

  const pdfBuffer = await generateSiteFixPDF(reportProps);
  const reportId = adminDb.collection('_').doc().id;

  await uploadReportPDF(params.uid, params.sessionId, reportId, pdfBuffer);

  await sessionRef.update({
    'report.status': 'generated',
    'report.reportId': reportId,
    'report.generatedAt': FieldValue.serverTimestamp(),
    'report.deliveryNote': trimmedNote ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { reportId };
}
