import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * Authentication result type
 */
export type AuthResult = {
  userId: string | null;
  error: string | null;
};

/**
 * Verified authentication result (for requireAuth)
 */
export type VerifiedAuth = {
  userId: string;
};

/**
 * Verifies Firebase ID token from Authorization header
 * 
 * @param req - Next.js request object
 * @returns Object containing userId on success or error message on failure
 * 
 * @example
 * const { userId, error } = await verifyAuthToken(request);
 * if (error) {
 *   return NextResponse.json({ error }, { status: 401 });
 * }
 * // Use userId for authenticated operations
 */
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  try {
    // Check if Firebase Admin is initialized
    if (!adminAuth) {
      console.error('Firebase Admin Auth not initialized');
      return {
        userId: null,
        error: 'Server configuration error - Authentication service unavailable',
      };
    }

    // Extract Authorization header (lowercase per HTTP/2 standard)
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return {
        userId: null,
        error: 'Unauthorized - No authentication token provided',
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        userId: null,
        error: 'Unauthorized - Invalid authentication format',
      };
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split('Bearer ')[1];
    
    if (!token || token.trim() === '') {
      return {
        userId: null,
        error: 'Unauthorized - Empty authentication token',
      };
    }

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Extract user ID from decoded token
    const userId = decodedToken.uid;
    
    if (!userId) {
      return {
        userId: null,
        error: 'Invalid token - No user ID found',
      };
    }

    return {
      userId,
      error: null,
    };

  } catch (error: any) {
    console.error('Auth verification error:', error);

    // Handle Firebase-specific auth errors
    if (error.code === 'auth/argument-error') {
      return {
        userId: null,
        error: 'Invalid authentication token format',
      };
    }

    if (error.code === 'auth/id-token-expired') {
      return {
        userId: null,
        error: 'Authentication token has expired - Please sign in again',
      };
    }

    if (error.code === 'auth/id-token-revoked') {
      return {
        userId: null,
        error: 'Authentication token has been revoked - Please sign in again',
      };
    }

    if (error.code === 'auth/invalid-id-token') {
      return {
        userId: null,
        error: 'Invalid authentication token',
      };
    }

    // Generic error fallback
    return {
      userId: null,
      error: 'Authentication verification failed',
    };
  }
}

/**
 * Wrapper function that automatically returns 401 response on auth failure
 * or returns the verified userId on success
 * 
 * @param req - Next.js request object
 * @returns NextResponse with 401 error OR VerifiedAuth object with userId
 * 
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await requireAuth(request);
 *   
 *   // If auth is a NextResponse, it's an error response - return it
 *   if (auth instanceof NextResponse) {
 *     return auth;
 *   }
 *   
 *   // Otherwise, use auth.userId for authenticated operations
 *   const { userId } = auth;
 *   // ... rest of route logic
 * }
 */
export async function requireAuth(
  req: NextRequest
): Promise<NextResponse | VerifiedAuth> {
  const { userId, error } = await verifyAuthToken(req);

  if (error || !userId) {
    // Determine appropriate status code
    const status = error?.includes('Server configuration') ? 500 : 401;
    
    return NextResponse.json(
      { error: error || 'Authentication required' },
      { status }
    );
  }

  return { userId };
}

/**
 * Check if the result from requireAuth is an error response
 * Type guard function for better TypeScript experience
 * 
 * @param result - Result from requireAuth
 * @returns true if result is an error response (NextResponse)
 * 
 * @example
 * const result = await requireAuth(request);
 * if (isAuthError(result)) {
 *   return result; // Return error response
 * }
 * const { userId } = result; // TypeScript knows this is VerifiedAuth
 */
export function isAuthError(
  result: NextResponse | VerifiedAuth
): result is NextResponse {
  return result instanceof NextResponse;
}
