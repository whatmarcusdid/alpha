import 'server-only';

import crypto from 'crypto';

export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashAccessToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function verifyAccessToken(rawToken: string, storedHash: string): boolean {
  const inputHash = hashAccessToken(rawToken);

  if (inputHash.length !== storedHash.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}
