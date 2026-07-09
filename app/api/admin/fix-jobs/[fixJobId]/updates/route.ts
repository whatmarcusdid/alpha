import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { postFixUpdate } from '@/lib/fix-jobs/post-fix-update';
import { withAdmin } from '@/lib/middleware/apiHandler';
import {
  adminFixUpdatesLimiter,
  applyRateLimit,
  getRateLimitHeaders,
} from '@/lib/middleware/rateLimiting';

const PostUpdateSchema = z.object({
  uid: z.string().min(1),
  message: z
    .string()
    .min(1)
    .max(280)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, {
      message: 'Message cannot be empty',
    })
    .refine((value) => value.length <= 280, {
      message: 'Message must be 280 characters or fewer',
    }),
  pillar: z.enum(['speed', 'security', 'seo_ai_visibility']).optional(),
  signalKey: z.string().optional(),
});

export const POST = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const rateLimitResult = await applyRateLimit(
    adminFixUpdatesLimiter,
    `admin-fix-updates:${context.userId}`
  );

  if (!rateLimitResult.success) {
    const headers = getRateLimitHeaders(rateLimitResult);
    return NextResponse.json(
      { error: 'Too many update posts. Please try again shortly.' },
      { status: 429, headers }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = PostUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await postFixUpdate({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    message: parsed.data.message,
    pillar: parsed.data.pillar,
    signalKey: parsed.data.signalKey,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: { updateId: result.updateId },
  });
});
