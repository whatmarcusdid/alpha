import type { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';

import { adminAuth } from '@/lib/firebase/admin';
import { verifyAuthIdToken } from '@/lib/firebase/verify-id-token';

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function resolveAuthenticatedEmail(
  decodedToken: DecodedIdToken
): Promise<string | null> {
  if (typeof decodedToken.email === 'string' && decodedToken.email.trim()) {
    return normalizeEmail(decodedToken.email);
  }

  if (!adminAuth) {
    return null;
  }

  const userRecord = await adminAuth.getUser(decodedToken.uid);
  if (typeof userRecord.email === 'string' && userRecord.email.trim()) {
    return normalizeEmail(userRecord.email);
  }

  return null;
}

export async function getAuthenticatedEmailFromRequest(
  req: NextRequest
): Promise<string | null> {
  if (!adminAuth) {
    return null;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return null;
  }

  const decodedToken = await verifyAuthIdToken(token);
  return resolveAuthenticatedEmail(decodedToken);
}

export function emailsMatch(
  authenticatedEmail: string,
  resourceEmail: string | null | undefined
): boolean {
  if (!resourceEmail || !resourceEmail.trim()) {
    return false;
  }

  return normalizeEmail(authenticatedEmail) === normalizeEmail(resourceEmail);
}
