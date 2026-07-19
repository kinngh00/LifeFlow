import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_PASSWORD_MAX_LENGTH = 128;

function deriveKey(password: string, salt: Buffer, keyLength: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...options, maxmem: MAX_MEMORY }, (error, key) => error ? reject(error) : resolve(key));
  });
}

function assertPasswordLength(password: string): void {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH || password.length > ADMIN_PASSWORD_MAX_LENGTH || Buffer.byteLength(password, "utf8") > 256) {
    throw new RangeError("관리자 비밀번호 길이가 허용 범위를 벗어났습니다.");
  }
}

export async function hashAdminPassword(password: string): Promise<string> {
  assertPasswordLength(password);
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, KEY_LENGTH, salt.toString("base64url"), derivedKey.toString("base64url")].join("$");
}

export async function verifyAdminPassword(password: string, storedHash: string): Promise<boolean> {
  if (password.length > ADMIN_PASSWORD_MAX_LENGTH || Buffer.byteLength(password, "utf8") > 256) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 7 || parts[0] !== "scrypt") return false;
  const [n, r, p, keyLength] = parts.slice(1, 5).map(Number);
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P || keyLength !== KEY_LENGTH) return false;
  try {
    const salt = Buffer.from(parts[5]!, "base64url"); const expected = Buffer.from(parts[6]!, "base64url");
    if (salt.length !== 16 || expected.length !== keyLength) return false;
    const actual = await deriveKey(password, salt, keyLength, { N: n!, r: r!, p: p! });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
