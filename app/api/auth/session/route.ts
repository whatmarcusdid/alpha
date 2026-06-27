import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createSessionCookie,
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
} from '@/lib/firebase/session';

const createSessionSchema = z.object({
  idToken: z.string().min(1),
});

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(SESSION_COOKIE_MAX_AGE_MS / 1000),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const sessionCookie = await createSessionCookie(parsed.data.idToken);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, sessionCookieOptions());

    return response;
  } catch (error) {
    console.error('[auth/session] POST failed:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}
