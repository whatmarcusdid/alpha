import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getFixJob } from '@/lib/fix-jobs/firestore';
import { getQADoc, initializeQADoc, updateQAItem } from '@/lib/fix-jobs/qa-firestore';
import { serializeQADoc } from '@/lib/fix-jobs/serialize-loop';
import { withAdmin } from '@/lib/middleware/apiHandler';

const patchQASchema = z
  .object({
    itemId: z.string().min(1),
    result: z.enum(['pass', 'flag', 'fail']).nullable().optional(),
    flagNote: z.string().nullable().optional(),
  })
  .refine((value) => 'result' in value || 'flagNote' in value, {
    message: 'At least one of result or flagNote is required',
  });

export const GET = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const job = await getFixJob(params.fixJobId);
  if (!job) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  let qaDoc = await getQADoc(params.fixJobId);
  if (!qaDoc) {
    qaDoc = await initializeQADoc(params.fixJobId, job.entitlements);
  }

  return NextResponse.json({
    success: true,
    data: serializeQADoc(qaDoc),
  });
});

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const job = await getFixJob(params.fixJobId);
  if (!job) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchQASchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const qaDoc = await updateQAItem({
    fixJobId: params.fixJobId,
    itemId: parsed.data.itemId,
    result: 'result' in parsed.data ? parsed.data.result : undefined,
    flagNote: 'flagNote' in parsed.data ? parsed.data.flagNote : undefined,
    entitlements: job.entitlements,
  });

  return NextResponse.json({
    success: true,
    data: serializeQADoc(qaDoc),
  });
});
