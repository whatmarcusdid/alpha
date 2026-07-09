import { NextRequest, NextResponse } from 'next/server';

import { revokeSiteAccessRequest } from '@/lib/site-access/revoke-site-access-request';
import { withAdmin } from '@/lib/middleware/apiHandler';
import { RevokeAccessSchema } from '@/lib/validation/site-access-request';

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  const requestId = params?.requestId;

  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RevokeAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const result = await revokeSiteAccessRequest({
    requestId,
    uid: parsed.data.uid,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
});
