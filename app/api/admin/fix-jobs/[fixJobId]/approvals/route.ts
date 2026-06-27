import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getFixJob } from '@/lib/fix-jobs/firestore';
import { createExecutionStartApproval } from '@/lib/fix-jobs/approvals-firestore';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { withAdmin } from '@/lib/middleware/apiHandler';

const approvalSchema = z.object({
  gate: z.literal('execution_start'),
});

export const POST = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const { fixJobId } = params;
  const body = await req.json().catch(() => null);
  const parsed = approvalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const job = await getFixJob(fixJobId);
  if (!job) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  await createExecutionStartApproval(fixJobId, context.userId, job.entitlements);

  const updatedJob = await getFixJob(fixJobId);

  return NextResponse.json({
    success: true,
    data: updatedJob ? serializeFixJob(updatedJob) : null,
  });
});
