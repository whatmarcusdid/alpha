/**
 * Server-side encryption for Site Fix access credentials.
 * Uses AES-256-GCM with SITE_FIX_ENCRYPTION_KEY (32-byte base64).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

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

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, encryptedB64] = payload.split(':');

  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
