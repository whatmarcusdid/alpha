import type { NextRequest } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/firebase/session-constants';

/**
 * Edge-safe session probe used by middleware.
 *
 * Firebase Admin `verifySessionCookie()` cannot run in Edge middleware, so we
 * delegate verification to the Node.js `/api/auth/verify-session` route.
 */
export async function hasVerifiedSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return false;
  }

  const verifyUrl = new URL('/api/auth/verify-session', request.url);

  try {
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    });

    // Rate-limited verify responses must not log users out — middleware shares the
    // same IP bucket as direct abuse; fail-open when a session cookie is present.
    if (response.status === 429) {
      console.warn(
        '[middleware] verify-session rate limited — allowing navigation (fail-open)'
      );
      return true;
    }

    return response.ok;
  } catch (error) {
    console.error('[middleware] session verification request failed:', error);
    return false;
  }
}

export function clearSessionCookieHeader(): {
  name: string;
  value: string;
  path: string;
  maxAge: number;
} {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
  };
}
