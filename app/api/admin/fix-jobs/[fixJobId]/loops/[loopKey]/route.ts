import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getFixJob } from '@/lib/fix-jobs/firestore';
import { getLoopDoc, toggleLoopTask } from '@/lib/fix-jobs/loops-firestore';
import { serializeLoopDoc } from '@/lib/fix-jobs/serialize-loop';
import { withAdmin } from '@/lib/middleware/apiHandler';
import type { LoopKey } from '@/lib/types/loop';

const LOOP_KEYS = ['speed', 'security', 'seo'] as const;

function isLoopKey(value: string): value is LoopKey {
  return LOOP_KEYS.includes(value as LoopKey);
}

const toggleTaskSchema = z.object({
  taskId: z.string().min(1),
  checked: z.boolean(),
});

export const GET = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId || !params?.loopKey) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const { fixJobId, loopKey } = params;

  if (!isLoopKey(loopKey)) {
    return NextResponse.json({ error: 'Invalid loop key' }, { status: 400 });
  }

  const loopDoc = await getLoopDoc(fixJobId, loopKey);
  if (!loopDoc) {
    return NextResponse.json({ error: 'Loop doc not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeLoopDoc(loopDoc),
  });
});

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId || !params?.loopKey) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const { fixJobId, loopKey } = params;

  if (!isLoopKey(loopKey)) {
    return NextResponse.json({ error: 'Invalid loop key' }, { status: 400 });
  }

  const job = await getFixJob(fixJobId);
  if (!job) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = toggleTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const loopDoc = await toggleLoopTask({
    fixJobId,
    loopKey,
    taskId: parsed.data.taskId,
    checked: parsed.data.checked,
    entitlements: job.entitlements,
  });

  if (!loopDoc) {
    return NextResponse.json({ error: 'Loop doc not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeLoopDoc(loopDoc),
  });
});
