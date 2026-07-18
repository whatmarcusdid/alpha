import { NextRequest, NextResponse } from 'next/server';

import {
  clearSessionCookieHeader,
  hasVerifiedSession,
} from '@/lib/middleware/session-guard';

/**
 * Next.js Edge Middleware — Route Protection
 *
 * Protects authenticated routes by verifying the HttpOnly `__session` cookie
 * server-side via `/api/auth/verify-session` (Node.js + Firebase Admin).
 *
 * Edge constraint: Firebase Admin SDK cannot run in middleware, so verification
 * is delegated to an internal API route that calls verifySessionCookie(..., true).
 *
 * Protected routes:
 * - /dashboard/* — existing subscription dashboard
 * - /admin/* — Book Service admin dashboard (layout also runs requireAdminSession)
 * - /book-service/access — access submission (requires account)
 * - /book-service/confirm-details — details confirmation (requires account)
 */

const SIGN_IN_PATH = '/signin';

const PROTECTED_PATHS = [
  '/dashboard',
  '/admin',
  '/book-service/access',
  '/book-service/confirm-details',
];

const AUTH_ONLY_PATHS = ['/signin', '/signup'];

const PUBLIC_ACCESS_REQUEST_PATHS = new Set([
  '/book-service/access-request/grant',
  '/book-service/access-request/decline',
]);

function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_ACCESS_REQUEST_PATHS.has(pathname)) {
    return false;
  }

  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

function isDevPreviewRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  return request.nextUrl.searchParams.get('preview') === '1';
}

/** Dev-only preview URLs that skip auth so designers can review pages locally. */
function isDevPreviewBypass(request: NextRequest): boolean {
  if (!isDevPreviewRequest(request)) return false;

  const { pathname } = request.nextUrl;
  return (
    pathname.startsWith('/book-service/confirm-details') ||
    pathname.startsWith('/book-service/access')
  );
}

function redirectToSignIn(request: NextRequest, pathname: string): NextResponse {
  const signInUrl = new URL(SIGN_IN_PATH, request.url);
  signInUrl.searchParams.set('redirect', pathname);
  const response = NextResponse.redirect(signInUrl);
  response.cookies.set(clearSessionCookieHeader());
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname) && !isDevPreviewBypass(request)) {
    const isAuthenticated = await hasVerifiedSession(request);

    if (!isAuthenticated) {
      return redirectToSignIn(request, pathname);
    }
  }

  if (isAuthOnlyPath(pathname)) {
    const isAuthenticated = await hasVerifiedSession(request);

    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)',
  ],
};
