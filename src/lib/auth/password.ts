import { randomBytes, scrypt as _scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt (memory-hard). Parameters follow OWASP guidance (N=2^15, r=8, p=1) and are stored with each hash so they can be raised later.
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64;
const OPTS: ScryptOptions = { N, r: R, p: P, maxmem: 128 * N * R * 2 };

const scrypt = (pw: string, salt: Buffer, keylen: number, o: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => _scrypt(pw, salt, keylen, o, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, OPTS);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [alg, n, r, p, salt, key] = stored.split("$");
    if (alg !== "scrypt" || !n || !r || !p || !salt || !key) return false;
    const expected = Buffer.from(key, "base64");
    const o: ScryptOptions = { N: +n, r: +r, p: +p, maxmem: 128 * +n * +r * 2 };
    const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, o);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Returns an error message, or null when acceptable. Length-based (NIST 800-63B): no arbitrary composition rules. */
export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 12) return "Password must be at least 12 characters";
  if (pw.length > 200) return "Password must be at most 200 characters";
  return null;
}
