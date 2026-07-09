import { NextRequest, NextResponse } from 'next/server';

import { patchFixSessionProgress } from '@/lib/fix-jobs/patch-fix-session-progress';
import { withAdmin } from '@/lib/middleware/apiHandler';
import { SignalProgressPatchSchema } from '@/lib/validation/fix-session';

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SignalProgressPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await patchFixSessionProgress({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    signalKey: parsed.data.signalKey,
    action: parsed.data.action,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (parsed.data.action.type === 'set_phase0') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({
    success: true,
    data: result,
  });
});
