import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { buildPdfClosingSummary, buildReportFilename } from '@/lib/fix-jobs/delivery-helpers';
import { getEnabledLoopKeys } from '@/lib/fix-jobs/execution-logic';
import { FIX_JOBS_COLLECTION, getFixJob, updateFixJob } from '@/lib/fix-jobs/firestore';
import { listLoopDocs } from '@/lib/fix-jobs/loops-firestore';
import { QA_ITEMS, QA_SECTION_LABELS } from '@/lib/fix-jobs/qa-registry';
import { getQADoc } from '@/lib/fix-jobs/qa-firestore';
import { generateFixJobPDF } from '@/lib/pdf/generateFixJobPDF';
import type { FixJobReportLoopSection } from '@/lib/pdf/FixJobReportDocument';
import { uploadFixJobReportPdf } from '@/lib/pdf/uploadFixJobReport';
import { adminDb } from '@/lib/firebase/admin';
import type { FixJob } from '@/lib/types/fix-job';
import type { FixJobReportDoc } from '@/lib/types/delivery';

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

export function mapFirestoreDocToReportDoc(
  data: Record<string, unknown>
): FixJobReportDoc {
  const status = data.status;

  return {
    reportId: typeof data.reportId === 'string' ? data.reportId : '',
    fixJobId: typeof data.fixJobId === 'string' ? data.fixJobId : '',
    status: status === 'sent' ? 'sent' : 'generated',
    generatedAt: toDateOrNull(data.generatedAt) ?? new Date(0),
    sentAt: toDateOrNull(data.sentAt),
    previewUrl: typeof data.previewUrl === 'string' ? data.previewUrl : '',
    filename: typeof data.filename === 'string' ? data.filename : '',
    fileSizeBytes:
      typeof data.fileSizeBytes === 'number' ? data.fileSizeBytes : 0,
  };
}

export async function validateReportGeneration(fixJob: FixJob): Promise<string | null> {
  const enabledLoops = getEnabledLoopKeys(fixJob.entitlements);

  if (enabledLoops.length === 0) {
    return 'No purchased loops found for this fix job';
  }

  const loopDocs = await listLoopDocs(fixJob.id);
  const incompleteLoops = enabledLoops.filter((loopKey) => {
    const doc = loopDocs.find((item) => item.loopKey === loopKey);
    return doc?.status !== 'complete';
  });

  if (incompleteLoops.length > 0) {
    return `Not all purchased loops are complete: ${incompleteLoops.join(', ')}`;
  }

  const qaDoc = await getQADoc(fixJob.id);
  if (!qaDoc || qaDoc.overallStatus !== 'passed') {
    return 'QA must be passed before generating a report';
  }

  return null;
}

async function buildReportPdfData(fixJob: FixJob) {
  const qaDoc = await getQADoc(fixJob.id);
  const items = qaDoc?.items ?? {};

  const loopSections: FixJobReportLoopSection[] = [];

  const sectionMap: Array<{
    key: 'security' | 'speed' | 'seo';
    entitlement: boolean;
    loopName: string;
  }> = [
    {
      key: 'security',
      entitlement: fixJob.entitlements.security,
      loopName: QA_SECTION_LABELS.security.replace(' QA', ''),
    },
    {
      key: 'speed',
      entitlement: fixJob.entitlements.speed,
      loopName: QA_SECTION_LABELS.speed.replace(' QA', ''),
    },
    {
      key: 'seo',
      entitlement: fixJob.entitlements.seo,
      loopName: 'SEO & AI Visibility',
    },
  ];

  for (const section of sectionMap) {
    if (!section.entitlement) {
      continue;
    }

    const qaItems = QA_ITEMS.filter((item) => item.section === section.key).map(
      (item) => {
        const state = items[item.id];
        const result = state?.result;

        return {
          title: item.title,
          result: (result === 'flag' ? 'FLAG' : 'PASS') as 'PASS' | 'FLAG',
          flagNote: result === 'flag' ? state?.flagNote ?? null : null,
        };
      }
    );

    loopSections.push({
      loopName: section.loopName,
      qaItems,
    });
  }

  const deliveryDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    businessName: fixJob.businessName,
    websiteUrl: fixJob.primaryWebsiteUrl,
    displayId: fixJob.displayId,
    deliveryDate,
    loopSections,
    closingSummary: buildPdfClosingSummary(fixJob.businessName, fixJob.entitlements),
  };
}

export type GenerateReportResult = {
  reportId: string;
  previewUrl: string;
  filename: string;
  fileSizeBytes: number;
  generatedAt: Date;
};

export async function generateFixJobReport(
  fixJobId: string
): Promise<GenerateReportResult> {
  if (!adminDb) {
    throw new Error('Firebase Admin is not initialized');
  }

  const fixJob = await getFixJob(fixJobId);
  if (!fixJob) {
    throw new Error('Fix job not found');
  }

  if (fixJob.report?.status && fixJob.report.status !== 'not_generated') {
    const reportDoc = fixJob.report.reportId
      ? await getFixJobReportDoc(fixJobId, fixJob.report.reportId)
      : null;

    return {
      reportId: fixJob.report.reportId ?? '',
      previewUrl: fixJob.report.previewUrl ?? '',
      filename:
        reportDoc?.filename ??
        buildReportFilename(fixJob.displayId, fixJob.businessName),
      fileSizeBytes: reportDoc?.fileSizeBytes ?? 0,
      generatedAt: fixJob.report.generatedAt ?? new Date(),
    };
  }

  const validationError = await validateReportGeneration(fixJob);
  if (validationError) {
    throw new Error(validationError);
  }

  const pdfData = await buildReportPdfData(fixJob);
  const pdfBuffer = await generateFixJobPDF(pdfData);

  const reportRef = adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('reports')
    .doc();

  const reportId = reportRef.id;
  const filename = buildReportFilename(fixJob.displayId, fixJob.businessName);
  const upload = await uploadFixJobReportPdf(fixJobId, reportId, pdfBuffer);
  const generatedAt = new Date();

  await reportRef.set({
    reportId,
    fixJobId,
    status: 'generated',
    generatedAt: FieldValue.serverTimestamp(),
    sentAt: null,
    previewUrl: upload.previewUrl,
    filename,
    fileSizeBytes: upload.fileSizeBytes,
    storagePath: upload.storagePath,
  });

  await updateFixJob(fixJobId, {
    report: {
      status: 'generated',
      reportId,
      generatedAt,
      sentAt: null,
      previewUrl: upload.previewUrl,
    },
  });

  return {
    reportId,
    previewUrl: upload.previewUrl,
    filename,
    fileSizeBytes: upload.fileSizeBytes,
    generatedAt,
  };
}

export async function getFixJobReportDoc(
  fixJobId: string,
  reportId: string
): Promise<FixJobReportDoc | null> {
  if (!adminDb) {
    return null;
  }

  const snapshot = await adminDb
    .collection(FIX_JOBS_COLLECTION)
    .doc(fixJobId)
    .collection('reports')
    .doc(reportId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return mapFirestoreDocToReportDoc(snapshot.data() as Record<string, unknown>);
}
