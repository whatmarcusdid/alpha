import { NextRequest, NextResponse } from 'next/server';

import {
  getCredentialRowsForFixJob,
  getDeliveryStepCountFromJob,
  listAccessRevocations,
} from '@/lib/fix-jobs/delivery-firestore';
import { getFixJob } from '@/lib/fix-jobs/firestore';
import { getFixJobReportDoc } from '@/lib/fix-jobs/reports-firestore';
import { buildReportFilename } from '@/lib/fix-jobs/delivery-helpers';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const GET = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const fixJob = await getFixJob(params.fixJobId);
  if (!fixJob) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  const revocations = await listAccessRevocations(params.fixJobId);
  const credentials = await getCredentialRowsForFixJob(
    params.fixJobId,
    fixJob.linkedUserId,
    fixJob.createdAt
  );

  let reportMeta: {
    filename: string;
    fileSizeBytes: number;
  } | null = null;

  if (fixJob.report?.reportId) {
    const reportDoc = await getFixJobReportDoc(params.fixJobId, fixJob.report.reportId);
    reportMeta = {
      filename:
        reportDoc?.filename ??
        buildReportFilename(fixJob.displayId, fixJob.businessName),
      fileSizeBytes: reportDoc?.fileSizeBytes ?? 0,
    };
  }

  return NextResponse.json({
    success: true,
    data: {
      job: serializeFixJob(fixJob),
      credentials,
      revocations: revocations.map((item) => ({
        credentialType: item.credentialType,
        revokedAt: item.revokedAt.toISOString(),
        revokedBy: item.revokedBy,
      })),
      reportMeta,
      completedSteps: getDeliveryStepCountFromJob(fixJob, revocations),
    },
  });
});
