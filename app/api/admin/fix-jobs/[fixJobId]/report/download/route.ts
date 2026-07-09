import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase/admin';
import { withAdmin } from '@/lib/middleware/apiHandler';
import { getReportDownloadStream } from '@/lib/storage/adminStorage';
import type { FixSessionDoc } from '@/lib/types/fix-session';

export const GET = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid query param' }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const sessionSnap = await adminDb
    .collection('users')
    .doc(uid)
    .collection('fixSessions')
    .doc(params.fixJobId)
    .get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  const session = sessionSnap.data() as FixSessionDoc;
  const reportId = session.report?.reportId;

  if (!reportId) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  try {
    const stream = await getReportDownloadStream(uid, params.fixJobId, reportId);

    return new NextResponse(stream as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="site-fix-report.pdf"',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'REPORT_NOT_FOUND') {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    throw error;
  }
});
