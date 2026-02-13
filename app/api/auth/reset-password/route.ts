import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const MIN_PASSWORD_LENGTH = 8;

type TokenValidationResult =
  | { valid: true; email: string; userId: string }
  | { valid: false; error: string };

async function validateToken(token: string): Promise<TokenValidationResult> {
  if (!adminDb) {
    return { valid: false, error: 'Server configuration error' };
  }

  if (!token || token.length !== 64 || !/^[a-f0-9]+$/.test(token)) {
    return { valid: false, error: 'Invalid reset link. Please request a new password reset.' };
  }

  const docRef = adminDb.collection('passwordResets').doc(token);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return { valid: false, error: 'Invalid reset link. Please request a new password reset.' };
  }

  const tokenData = docSnap.data() as {
    used?: boolean;
    expiresAt?: string | { toDate: () => Date };
    email?: string;
    userId?: string;
  };

  if (tokenData.used === true) {
    return { valid: false, error: 'This reset link has already been used. Please request a new password reset.' };
  }

  const expiresAtRaw = tokenData.expiresAt;
  const expiry =
    expiresAtRaw &&
    typeof expiresAtRaw === 'object' &&
    'toDate' in expiresAtRaw &&
    typeof (expiresAtRaw as { toDate: () => Date }).toDate === 'function'
      ? (expiresAtRaw as { toDate: () => Date }).toDate()
      : new Date((expiresAtRaw as string) ?? 0);
  if (expiry <= new Date()) {
    return { valid: false, error: 'This reset link has expired. Please request a new password reset.' };
  }

  const email = tokenData.email;
  const userId = tokenData.userId;
  if (!email || !userId) {
    return { valid: false, error: 'Invalid reset link. Please request a new password reset.' };
  }

  return { valid: true, email, userId };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') ?? '';

    const result = await validateToken(token);

    if (result.valid) {
      return NextResponse.json({ valid: true, email: result.email });
    }

    return NextResponse.json({ valid: false, error: result.error });
  } catch (error) {
    console.error('[Reset Password] GET error:', error);
    return NextResponse.json(
      { valid: false, error: 'An unexpected error occurred. Please try again later.' }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let body: { token?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const validation = await validateToken(token);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { userId } = validation;
    const docRef = adminDb.collection('passwordResets').doc(token);

    // Mark token as used BEFORE updating password (prevents race conditions)
    await docRef.update({
      used: true,
      usedAt: new Date().toISOString(),
    });

    try {
      await adminAuth.updateUser(userId, { password });
      return NextResponse.json({
        success: true,
        message: 'Your password has been reset successfully. You can now sign in with your new password.',
      });
    } catch (passwordError) {
      console.error('[Reset Password] Password update failed:', passwordError);

      // Revert token to unused so user can try again
      try {
        await docRef.update({
          used: false,
          usedAt: FieldValue.delete(),
        });
      } catch (revertError) {
        console.error('[Reset Password] Failed to revert token:', revertError);
      }

      const message =
        passwordError && typeof passwordError === 'object' && 'code' in passwordError
          ? (passwordError as { code?: string }).code
          : null;

      if (message === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'An unexpected error occurred while resetting your password. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Reset Password] POST error:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
