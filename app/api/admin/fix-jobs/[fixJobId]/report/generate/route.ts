import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateSiteFixReport } from '@/lib/fix-jobs/generate-site-fix-report';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const runtime = 'nodejs';
export const maxDuration = 60;

const generateReportSchema = z.object({
  uid: z.string().min(1),
  deliveryNote: z.string().optional(),
});

export const POST = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await generateSiteFixReport({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    deliveryNote: parsed.data.deliveryNote,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: { reportId: result.reportId },
  });
});
