import { describe, it, expect } from "vitest";
import { z } from "zod";
import { handlePublic, sessionCookie, clientIp } from "@/lib/api/public";
import { RateLimiter } from "@/lib/security/ratelimit";

const schema = z.object({ email: z.string() }).strict();
const mk = (o: { origin?: string | null; body?: unknown; ip?: string; raw?: string } = {}) =>
  new Request("https://app.test/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(o.origin === null ? {} : { origin: o.origin ?? "https://app.test" }),
      "x-forwarded-for": o.ip ?? "1.2.3.4, 10.0.0.1",
    },
    body: o.raw ?? JSON.stringify(o.body ?? { email: "a@b.co" }),
  });
const ok = async () => Response.json({ ok: true });

describe("handlePublic()", () => {
  it("passes a same-origin valid request", async () => {
    const r = await handlePublic({ schema, limiter: new RateLimiter(5, 1000) }, ok)(mk());
    expect(r.status).toBe(200);
  });
  it("blocks cross-origin and missing-origin (CSRF)", async () => {
    const h = handlePublic({ schema, limiter: new RateLimiter(5, 1000) }, ok);
    expect((await h(mk({ origin: "https://evil.test" }))).status).toBe(403);
    expect((await h(mk({ origin: null }))).status).toBe(403);
  });
  it("rate limits per client IP with Retry-After", async () => {
    const h = handlePublic({ schema, limiter: new RateLimiter(1, 60_000) }, ok);
    await h(mk());
    const r = await h(mk());
    expect(r.status).toBe(429); expect(r.headers.get("retry-after")).toBeTruthy();
    expect((await h(mk({ ip: "9.9.9.9" }))).status).toBe(200);
  });
  it("400 on invalid body and malformed JSON; sets no-store", async () => {
    const h = handlePublic({ schema, limiter: new RateLimiter(50, 1000) }, ok);
    const bad = await h(mk({ body: { email: 1 } }));
    expect(bad.status).toBe(400); expect(bad.headers.get("cache-control")).toBe("no-store");
    expect((await h(mk({ raw: "{nope" }))).status).toBe(400);
  });
  it("hides thrown errors", async () => {
    const h = handlePublic({ schema, limiter: new RateLimiter(5, 1000) }, async () => { throw new Error("secret=hunter2"); });
    const r = await h(mk());
    expect(r.status).toBe(500); expect(JSON.stringify(await r.json())).not.toContain("hunter2");
  });
});

describe("helpers", () => {
  it("clientIp uses first forwarded address", () => {
    expect(clientIp(mk())).toBe("1.2.3.4");
  });
  it("sessionCookie is HttpOnly, SameSite=Lax, Path=/, Secure over https", () => {
    const c = sessionCookie("tok", 60, true);
    expect(c).toMatch(/HttpOnly/); expect(c).toMatch(/SameSite=Lax/); expect(c).toMatch(/Path=\//); expect(c).toMatch(/Secure/);
    expect(sessionCookie("tok", 60, false)).not.toMatch(/Secure/);
    expect(sessionCookie("", 0, true)).toMatch(/Max-Age=0/);
  });
});
