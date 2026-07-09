import { NextRequest, NextResponse } from 'next/server';

import { confirmHostingContext } from '@/lib/fix-jobs/confirm-hosting-context';
import { withAdmin } from '@/lib/middleware/apiHandler';
import { HostingContextSchema } from '@/lib/validation/hosting-context';

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = HostingContextSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await confirmHostingContext({
    uid: parsed.data.uid,
    sessionId: params.fixJobId,
    adminUid: context.userId,
    host: parsed.data.host,
    hostLabel: parsed.data.hostLabel,
    cms: parsed.data.cms,
    cmsVersion: parsed.data.cmsVersion,
    plugins: parsed.data.plugins,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: { hostingContext: result.hostingContext },
  });
});
