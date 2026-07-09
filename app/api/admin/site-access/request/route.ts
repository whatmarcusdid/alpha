import { NextRequest, NextResponse } from 'next/server';

import { createSiteAccessRequest } from '@/lib/site-access/create-site-access-request';
import { withAdmin } from '@/lib/middleware/apiHandler';
import {
  adminSiteAccessRequestLimiter,
  applyRateLimit,
  getRateLimitHeaders,
} from '@/lib/middleware/rateLimiting';
import { RequestSiteAccessSchema } from '@/lib/validation/site-access-request';

export const POST = withAdmin(async (req: NextRequest, context) => {
  const body = await req.json().catch(() => null);
  const parsed = RequestSiteAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const rateLimitResult = await applyRateLimit(
    adminSiteAccessRequestLimiter,
    `admin-site-access-request:${context.userId}`
  );

  if (!rateLimitResult.success) {
    const headers = getRateLimitHeaders(rateLimitResult);
    return NextResponse.json(
      { error: 'Too many access re-request attempts. Please try again shortly.' },
      { status: 429, headers }
    );
  }

  const result = await createSiteAccessRequest({
    uid: parsed.data.uid,
    sessionId: parsed.data.sessionId,
    adminUid: context.userId,
    accessType: parsed.data.accessType,
    scopeDescription: parsed.data.scopeDescription,
    expiryDays: parsed.data.expiryDays,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: { requestId: result.requestId },
  });
});
