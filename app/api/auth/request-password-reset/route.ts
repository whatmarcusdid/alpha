import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendPasswordResetEmail } from '@/lib/loops';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

// In-memory rate limit: max 5 requests per hour per email
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_EXPIRY_HOURS = 1;

const emailRateLimit = new Map<
  string,
  { timestamps: number[] }
>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase().trim();
  let entry = emailRateLimit.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    emailRateLimit.set(key, entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  return entry.timestamps.length >= RATE_LIMIT_MAX;
}

function recordRequest(email: string): void {
  const now = Date.now();
  const key = email.toLowerCase().trim();
  let entry = emailRateLimit.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    emailRateLimit.set(key, entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  entry.timestamps.push(now);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Rate limit: return success even when limited (don't reveal to attackers)
    if (isRateLimited(emailLower)) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions shortly.',
      });
    }

    // Check if user exists in Firebase Auth
    let userId: string | null = null;
    let firstName: string | undefined;
    try {
      const result = await adminAuth.getUsers([{ email: emailLower }]);
      if (result.users.length > 0) {
        userId = result.users[0].uid;
        firstName = result.users[0].displayName?.split(' ')[0];
      }
    } catch {
      // Treat lookup failure as user not found - continue and return success
    }

    // If user doesn't exist, return success anyway (security - don't reveal)
    if (!userId) {
      recordRequest(emailLower);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions shortly.',
      });
    }

    // Generate secure token and tokenId
    const token = crypto.randomBytes(32).toString('hex');
    const tokenId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store in Firestore passwordResets collection
    await adminDb.collection('passwordResets').doc(token).set({
      tokenId,
      email: emailLower,
      userId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    });

    recordRequest(emailLower);

    // Build reset URL
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Mode: loops or console (for testing before Loops template is ready)
    const mode = process.env.PASSWORD_RESET_EMAIL_MODE ?? 'loops';

    if (mode === 'console' || !process.env.LOOPS_API_KEY) {
      console.log('[Password Reset] Dev mode - reset URL:', resetUrl);
    } else {
      const loopsResult = await sendPasswordResetEmail(email, {
        resetUrl,
        firstName,
      });
      if (!loopsResult.success) {
        console.error('[Password Reset] Loops email failed:', loopsResult.error);
        // Still return success - don't reveal email delivery failure
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions shortly.',
    });
  } catch (error) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
