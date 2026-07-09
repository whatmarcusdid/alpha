import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/middleware/apiHandler';
import { getReportDownloadStream } from '@/lib/storage/adminStorage';
import type { FixSessionDoc } from '@/lib/types/fix-session';

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId query param' }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const sessionSnap = await adminDb
    .collection('users')
    .doc(userId)
    .collection('fixSessions')
    .doc(sessionId)
    .get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const session = sessionSnap.data() as FixSessionDoc;

  if (session.report?.status !== 'sent') {
    return NextResponse.json({ error: 'Report not yet available' }, { status: 403 });
  }

  const reportId = session.report.reportId;
  if (!reportId) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  try {
    const stream = await getReportDownloadStream(userId, sessionId, reportId);

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
