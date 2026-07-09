import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { patchFixSessionQa } from '@/lib/fix-jobs/patch-fix-session-qa';
import { withAdmin } from '@/lib/middleware/apiHandler';

const qaPatchSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set_manual_check'),
    uid: z.string().min(1),
    pillar: z.enum(['speed', 'security', 'seo_ai_visibility']),
    itemId: z.string().min(1),
    checked: z.boolean(),
  }),
  z.object({
    type: z.literal('decide'),
    uid: z.string().min(1),
    pillar: z.enum(['speed', 'security', 'seo_ai_visibility']),
    status: z.enum(['passed', 'failed']),
    note: z.string().optional(),
  }),
]);

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = qaPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await patchFixSessionQa({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    adminUid: context.userId,
    action:
      parsed.data.type === 'set_manual_check'
        ? {
            type: 'set_manual_check',
            pillar: parsed.data.pillar,
            itemId: parsed.data.itemId,
            checked: parsed.data.checked,
          }
        : {
            type: 'decide',
            pillar: parsed.data.pillar,
            status: parsed.data.status,
            note: parsed.data.note,
          },
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (parsed.data.type === 'set_manual_check') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({
    success: true,
    data: { perPillar: result.perPillar },
  });
});
