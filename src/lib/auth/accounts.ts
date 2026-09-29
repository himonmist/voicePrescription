import type { Actor, Role } from "@/lib/ai/security/authz";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./password";

export interface UserRecord {
  id: string; email: string; name?: string | null; passwordHash: string; role: Role; orgId: string | null;
}
export interface UserRepo {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(u: { email: string; name?: string | null; passwordHash: string }): Promise<UserRecord>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normalizeEmail = (e: string) => e.trim().toLowerCase();

// Verified against when the account doesn't exist so unknown-user and wrong-password take similar time.
let dummyHash: Promise<string> | undefined;

export async function registerUser(
  repo: UserRepo, input: { email: string; password: string; name?: string },
): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(input.email);
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: "Enter a valid email address" };
  const weak = validatePasswordStrength(input.password);
  if (weak) return { ok: false, error: weak };
  if (await repo.findByEmail(email)) return { ok: false, error: "Could not create account" }; // generic: no enumeration
  try {
    // Role is never taken from input: every self-registered account is a plain USER.
    await repo.create({ email, name: input.name?.trim().slice(0, 100) || null, passwordHash: await hashPassword(input.password) });
  } catch {
    return { ok: false, error: "Could not create account" }; // e.g. unique-constraint race
  }
  return { ok: true };
}

export async function loginUser(
  repo: UserRepo, input: { email: string; password: string },
): Promise<{ ok: boolean; error?: string; actor?: Actor }> {
  const fail = { ok: false as const, error: "Invalid email or password" };
  const user = await repo.findByEmail(normalizeEmail(input.email));
  if (!user) {
    dummyHash ??= hashPassword("dummy-password-for-timing");
    await verifyPassword(input.password, await dummyHash);
    return fail;
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) return fail;
  return { ok: true, actor: { userId: user.id, orgId: user.orgId, role: user.role } };
}
