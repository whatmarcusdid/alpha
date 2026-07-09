import { NextRequest, NextResponse } from 'next/server';

import { grantSiteAccess } from '@/lib/site-access/grant-site-access';
import {
  applyRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
  siteAccessGrantDeclineLimiter,
} from '@/lib/middleware/rateLimiting';
import { GrantDeclineAccessSchema } from '@/lib/validation/site-access-request';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = GrantDeclineAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const rateLimitResult = await applyRateLimit(
    siteAccessGrantDeclineLimiter,
    `site-access-grant:${getClientIdentifier(req)}`
  );

  if (!rateLimitResult.success) {
    const headers = getRateLimitHeaders(rateLimitResult);
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers }
    );
  }

  const result = await grantSiteAccess(parsed.data.token);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    data: { expiresAt: result.expiresAt },
  });
}
