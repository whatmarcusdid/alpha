import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateFixJobReport } from '@/lib/fix-jobs/reports-firestore';
import { withAdmin } from '@/lib/middleware/apiHandler';

const generateSchema = z.object({
  fixJobId: z.string().min(1),
});

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  try {
    const result = await generateFixJobReport(parsed.data.fixJobId);

    return NextResponse.json({
      success: true,
      data: {
        reportId: result.reportId,
        previewUrl: result.previewUrl,
        filename: result.filename,
        fileSizeBytes: result.fileSizeBytes,
        generatedAt: result.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';

    if (
      message.includes('complete') ||
      message.includes('QA') ||
      message.includes('not found') ||
      message.includes('purchased')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('[reports/generate] Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
});
