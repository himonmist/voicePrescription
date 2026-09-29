import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "@/lib/auth/session";

const secret = "x".repeat(32);
const actor = { userId: "u1", orgId: "o1", role: "DOCTOR" as const };
describe("session tokens", () => {
  it("round-trips", () => expect(verifySession(signSession(actor, secret, 60), secret)).toEqual(actor));
  it("rejects tampering", () => {
    const t = signSession(actor, secret, 60); const [p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...actor, role: "PLATFORM_ADMIN", exp: 9e12 })).toString("base64url");
    expect(verifySession(`${forged}.${s}`, secret)).toBeNull();
    expect(verifySession(`${p}.AAAA`, secret)).toBeNull();
  });
  it("rejects wrong secret, expiry, garbage", () => {
    expect(verifySession(signSession(actor, secret, 60), "y".repeat(32))).toBeNull();
    expect(verifySession(signSession(actor, secret, -1), secret)).toBeNull();
    expect(verifySession("garbage", secret)).toBeNull();
    expect(verifySession("", secret)).toBeNull();
  });
  it("refuses weak secrets", () => expect(() => signSession(actor, "short", 60)).toThrow());
});
