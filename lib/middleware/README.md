# Middleware Documentation

This directory contains reusable middleware functions for API route protection and utilities.

## auth.ts - Authentication Middleware

Consolidates Firebase Admin authentication logic that was previously duplicated across 5+ API routes.

### Functions

#### `verifyAuthToken(req: NextRequest): Promise<AuthResult>`

Low-level function that extracts and verifies the Firebase ID token from the Authorization header.

**Returns:** `{ userId: string | null, error: string | null }`

**Use when:** You need fine-grained control over error handling or want to perform custom logic based on auth failures.

**Example:**
```typescript
import { verifyAuthToken } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  const { userId, error } = await verifyAuthToken(request);
  
  if (error) {
    // Custom error handling
    console.log('Auth failed:', error);
    return NextResponse.json({ error }, { status: 401 });
  }
  
  // Use userId for database operations
  const userDoc = await adminDb.collection('users').doc(userId).get();
  // ...
}
```

#### `requireAuth(req: NextRequest): Promise<NextResponse | VerifiedAuth>`

High-level wrapper that automatically returns a 401/500 error response on auth failure, or returns the verified userId on success.

**Returns:** `NextResponse` (error) OR `{ userId: string }` (success)

**Use when:** You want the simplest integration - just check if it's an error and return it, otherwise use the userId.

**Example:**
```typescript
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await requireAuth(request);
  
  // If auth is a NextResponse, it's an error - return it immediately
  if (auth instanceof NextResponse) {
    return auth;
  }
  
  // Auth succeeded - use userId
  const { userId } = auth;
  
  // Your route logic here
  const userDoc = await adminDb.collection('users').doc(userId).get();
  // ...
}
```

#### `isAuthError(result): result is NextResponse`

Type guard function for better TypeScript experience when using `requireAuth`.

**Example:**
```typescript
import { requireAuth, isAuthError } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  const result = await requireAuth(request);
  
  if (isAuthError(result)) {
    return result; // TypeScript knows this is NextResponse
  }
  
  const { userId } = result; // TypeScript knows this is VerifiedAuth
  // ...
}
```

### Migration Guide

**Before (duplicated code in each route):**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 15+ lines of repeated auth logic
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    const token = authHeader.split('Bearer ')[1];
    if (!adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Actual route logic starts here
    // ...
  } catch (error: any) {
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    // ...
  }
}
```

**After (using middleware):**
```typescript
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // 3 lines replace 15+ lines
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;
    
    // Actual route logic starts here
    // ...
  } catch (error: any) {
    // Only handle business logic errors
    // Auth errors are already handled
  }
}
```

### Error Handling

The middleware handles these Firebase auth errors automatically:

- `auth/argument-error` → "Invalid authentication token format"
- `auth/id-token-expired` → "Authentication token has expired - Please sign in again"
- `auth/id-token-revoked` → "Authentication token has been revoked - Please sign in again"
- `auth/invalid-id-token` → "Invalid authentication token"
- Generic errors → "Authentication verification failed"

### Security Features

✅ Checks Firebase Admin initialization before attempting verification
✅ Validates Authorization header format (Bearer token)
✅ Validates token is not empty after extraction
✅ Returns consistent error messages
✅ Uses lowercase 'authorization' header (HTTP/2 standard)
✅ Proper TypeScript types for better IDE support
✅ Comprehensive error logging for debugging
