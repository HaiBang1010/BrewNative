import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hashes a password with scrypt. Output format: `scrypt$<salt>$<hash>` (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, saltPart, hashPart] = stored.split('$');
  if (algorithm !== 'scrypt' || !saltPart || !hashPart) return false;

  const expected = Buffer.from(hashPart, 'base64url');
  const actual = await scryptAsync(
    password,
    Buffer.from(saltPart, 'base64url'),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}
