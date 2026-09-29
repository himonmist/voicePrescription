import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies the right password, rejects the wrong one", async () => {
    const h = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("salts: same password gives different hashes; hash is not the plaintext", async () => {
    const a = await hashPassword("same-password-1"), b = await hashPassword("same-password-1");
    expect(a).not.toBe(b); expect(a).not.toContain("same-password-1");
  });
  it("rejects malformed stored hashes without throwing", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
  it("enforces strength: min 12 chars, max 200", () => {
    expect(validatePasswordStrength("short")).toMatch(/12/);
    expect(validatePasswordStrength("a".repeat(201))).toBeDefined();
    expect(validatePasswordStrength("a-long-enough-pass")).toBeNull();
  });
});
