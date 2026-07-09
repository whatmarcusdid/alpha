import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deliverSiteFix } from '@/lib/fix-jobs/deliver-site-fix';
import { withAdmin } from '@/lib/middleware/apiHandler';

const deliverSchema = z.object({
  uid: z.string().min(1),
  loomUrl: z
    .string()
    .url()
    .refine((url) => new URL(url).hostname.endsWith('loom.com'), {
      message: 'Must be a loom.com URL',
    })
    .optional(),
});

export const POST = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = deliverSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await deliverSiteFix({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    adminUid: context.userId,
    loomUrl: parsed.data.loomUrl,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: {
      sentAt: result.sentAt,
      ...(result.warning ? { warning: result.warning } : {}),
    },
  });
});
