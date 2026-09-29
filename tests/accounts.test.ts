import { describe, it, expect } from "vitest";
import { registerUser, loginUser, type UserRepo, type UserRecord } from "@/lib/auth/accounts";

function repo(): UserRepo & { rows: UserRecord[] } {
  const rows: UserRecord[] = [];
  return {
    rows,
    async findByEmail(e) { return rows.find((r) => r.email === e) ?? null; },
    async create(u) { const r = { id: `u${rows.length + 1}`, orgId: null, role: "USER" as const, ...u }; rows.push(r); return r; },
  };
}
const pw = "a-long-enough-pass";

describe("registerUser", () => {
  it("creates a USER-role account with hashed password; normalises email", async () => {
    const r = repo();
    const res = await registerUser(r, { email: "  Doc@Example.COM ", password: pw, name: "Doc" });
    expect(res.ok).toBe(true);
    expect(r.rows[0]!.email).toBe("doc@example.com");
    expect(r.rows[0]!.role).toBe("USER");
    expect(r.rows[0]!.passwordHash).not.toContain(pw);
  });
  it("rejects weak passwords and invalid emails", async () => {
    const r = repo();
    expect((await registerUser(r, { email: "a@b.co", password: "short" })).ok).toBe(false);
    expect((await registerUser(r, { email: "not-an-email", password: pw })).ok).toBe(false);
  });
  it("duplicate email gives a generic error (no account enumeration)", async () => {
    const r = repo();
    await registerUser(r, { email: "a@b.co", password: pw });
    const dup = await registerUser(r, { email: "A@B.co", password: pw });
    expect(dup.ok).toBe(false);
    expect(dup.error).toBe("Could not create account");
    expect(r.rows).toHaveLength(1);
  });
  it("ignores any attempt to set a privileged role", async () => {
    const r = repo();
    await registerUser(r, { email: "a@b.co", password: pw, role: "PLATFORM_ADMIN" } as never);
    expect(r.rows[0]!.role).toBe("USER");
  });
});

describe("loginUser", () => {
  it("returns an actor for valid credentials", async () => {
    const r = repo(); await registerUser(r, { email: "a@b.co", password: pw });
    const res = await loginUser(r, { email: "A@b.co", password: pw });
    expect(res.ok).toBe(true); expect(res.actor).toEqual({ userId: "u1", orgId: null, role: "USER" });
  });
  it("wrong password and unknown user give the identical error", async () => {
    const r = repo(); await registerUser(r, { email: "a@b.co", password: pw });
    const bad = await loginUser(r, { email: "a@b.co", password: "nope-nope-nope-1" });
    const none = await loginUser(r, { email: "x@y.co", password: pw });
    expect(bad).toEqual({ ok: false, error: "Invalid email or password" });
    expect(none).toEqual(bad);
  });
});
