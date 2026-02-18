import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { EMAIL_HMAC_KEY, EMAIL_ENCRYPTION_KEY } from '../config.js';

// AES-256-GCM: iv(12) + authTag(16) + ciphertext, hex-encoded
export function encryptEmail(plain: string): string {
  const key = Buffer.from(EMAIL_ENCRYPTION_KEY, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('hex');
}

export function decryptEmail(encoded: string): string {
  const key = Buffer.from(EMAIL_ENCRYPTION_KEY, 'hex');
  const buf = Buffer.from(encoded, 'hex');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// HMAC-SHA256 of lowercased+trimmed email — used for unique lookups
export function hashEmail(plain: string): string {
  return createHmac('sha256', EMAIL_HMAC_KEY).update(plain.trim().toLowerCase()).digest('hex');
}
