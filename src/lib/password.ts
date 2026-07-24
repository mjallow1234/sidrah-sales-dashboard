import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const DIGEST = 'sha256';

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, hashed: string): boolean {
  const parts = hashed.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = parts[1];
  const key = Buffer.from(parts[2], 'hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH) as Buffer;

  if (derivedKey.length !== key.length) {
    return false;
  }

  return timingSafeEqual(key, derivedKey);
}

export function hashToken(token: string): string {
  return createHash(DIGEST).update(token).digest('hex');
}
