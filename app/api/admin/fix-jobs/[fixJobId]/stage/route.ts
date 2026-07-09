import { NextRequest, NextResponse } from 'next/server';

import { patchFixSessionStage } from '@/lib/fix-jobs/patch-fix-session-stage';
import { withAdmin } from '@/lib/middleware/apiHandler';
import { StageTransitionSchema } from '@/lib/validation/fix-session';

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = StageTransitionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await patchFixSessionStage({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    toStage: parsed.data.toStage,
    adminUid: context.userId,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: result,
  });
});
