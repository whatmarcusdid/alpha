import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — Route Protection
 *
 * Protects authenticated routes by checking for the `bs-auth` presence cookie.
 * This is a lightweight signal only — actual Firebase token verification
 * happens server-side in API routes via Authorization: Bearer header.
 *
 * Protected routes:
 * - /dashboard/* — existing subscription dashboard
 * - /book-service/access — access submission (requires account)
 * - /book-service/signup — account creation (requires pending order context)
 *
 * Public Book Service routes (not protected):
 * - /book-service/confirmation — post-payment confirmation (public, no account yet)
 * - /book-service/confirm-details?preview=1 — dev-only design preview (development only)
 * - /book-service/access?preview=1 — dev-only design preview (development only)
 * - /book-service/select — package selection (public)
 * - /book-service/checkout — Stripe checkout (public)
 */

const SIGN_IN_PATH = '/signin';
const AUTH_COOKIE = 'bs-auth';

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/book-service/access',
  '/book-service/confirm-details',
];

// Routes that should redirect authenticated users away (auth pages)
const AUTH_ONLY_PATHS = [
  '/signin',
  '/signup',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(path => pathname.startsWith(path));
}

function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some(path => pathname.startsWith(path));
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get(AUTH_COOKIE);
  const isAuthenticated = !!authCookie?.value;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedPath(pathname) && !isAuthenticated && !isDevPreviewBypass(request)) {
    const signInUrl = new URL(SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from sign-in/sign-up pages
  if (isAuthOnlyPath(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (Next.js static files)
     * - _next/image (Next.js image optimization)
     * - favicon.ico
     * - Public API routes (/api/*)
     * - Public asset files (.png, .jpg, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)',
  ],
};
