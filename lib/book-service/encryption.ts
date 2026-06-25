/**
 * Server-side encryption for Site Fix access credentials.
 * Uses AES-256-GCM with SITE_FIX_ENCRYPTION_KEY (32-byte base64).
 */

import { createCipheriv, randomBytes } from 'crypto';

function getEncryptionKey(): Buffer {
  const raw = process.env.SITE_FIX_ENCRYPTION_KEY;
  if (!raw || raw === 'PLACEHOLDER') {
    throw new Error('SITE_FIX_ENCRYPTION_KEY is not configured');
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('SITE_FIX_ENCRYPTION_KEY must be a 32-byte base64-encoded key');
  }

  return key;
}

export function encryptSecret(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}
