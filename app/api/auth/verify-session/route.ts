import { NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/firebase/session-constants';
import { verifySessionCookie } from '@/lib/firebase/session';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { sessionVerifyLimiter } from '@/lib/middleware/rateLimiting';

export const runtime = 'nodejs';

/**
 * Node.js session verification endpoint for Edge middleware.
 * Middleware cannot use Firebase Admin directly — it forwards cookies here.
 */
async function verifySessionHandler(req: NextRequest): Promise<NextResponse> {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const session = await verifySessionCookie(sessionCookie);

  if (!session) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    uid: session.uid,
    isAdmin: session.isAdmin,
  });
}

export const GET = withRateLimit(verifySessionHandler, sessionVerifyLimiter);
