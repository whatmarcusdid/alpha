import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
  type VerifiedSession,
} from '@/lib/firebase/session';

export type AdminSessionContext = VerifiedSession;

/**
 * Server-side admin guard for app/admin layouts and pages.
 * Redirects before any admin UI renders when auth fails.
 */
export async function requireAdminSession(): Promise<AdminSessionContext> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect('/signin?redirect=/admin');
  }

  const session = await verifySessionCookie(sessionCookie);

  if (!session) {
    redirect('/signin?redirect=/admin');
  }

  if (!session.isAdmin) {
    redirect('/dashboard');
  }

  return session;
}
