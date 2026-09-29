import { describe, it, expect } from "vitest";
import { z } from "zod";
import { handle } from "@/lib/api/handler";
import { signSession } from "@/lib/auth/session";
import { RateLimiter } from "@/lib/security/ratelimit";

const secret = "s".repeat(32);
const cookie = (role = "DOCTOR") => `sda_session=${signSession({ userId: "u1", orgId: "o1", role: role as any }, secret, 60)}`;
const mkReq = (o: { cookie?: string; body?: unknown; method?: string; origin?: string; raw?: string } = {}) =>
  new Request("https://app.test/api/x", {
    method: o.method ?? "POST",
    headers: { "content-type": "application/json", ...(o.cookie ? { cookie: o.cookie } : {}), ...(o.origin ? { origin: o.origin } : { origin: "https://app.test" }) },
    body: o.raw ?? (o.body === undefined ? undefined : JSON.stringify(o.body)),
  });
const opts = (over = {}) => ({ secret, limiter: new RateLimiter(100, 1000), schema: z.object({ n: z.number() }).strict(), ...over });
const ok = async (c: any) => Response.json({ echo: c.body.n, user: c.actor.userId });

describe("handle()", () => {
  it("401 without session", async () => expect((await handle(opts(), ok)(mkReq({ body: { n: 1 } }))).status).toBe(401));
  it("401 on forged session", async () => expect((await handle(opts(), ok)(mkReq({ cookie: "sda_session=a.b", body: { n: 1 } }))).status).toBe(401));
  it("200 on valid", async () => {
    const r = await handle(opts(), ok)(mkReq({ cookie: cookie(), body: { n: 1 } }));
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ echo: 1, user: "u1" });
  });
  it("400 on invalid body, without leaking internals", async () => {
    const r = await handle(opts(), ok)(mkReq({ cookie: cookie(), body: { n: "x" } }));
    expect(r.status).toBe(400); expect((await r.json()).error.code).toBe("VALIDATION_ERROR");
  });
  it("400 on malformed JSON and rejects extra keys", async () => {
    expect((await handle(opts(), ok)(mkReq({ cookie: cookie(), raw: "{bad" }))).status).toBe(400);
    expect((await handle(opts(), ok)(mkReq({ cookie: cookie(), body: { n: 1, admin: true } }))).status).toBe(400);
  });
  it("413 on oversized body", async () => {
    const r = await handle(opts({ maxBytes: 10 }), ok)(mkReq({ cookie: cookie(), raw: JSON.stringify({ n: 1, pad: "x".repeat(50) }) }));
    expect(r.status).toBe(413);
  });
  it("403 when role not allowed", async () => {
    const r = await handle(opts({ roles: ["PLATFORM_ADMIN"] }), ok)(mkReq({ cookie: cookie("DOCTOR"), body: { n: 1 } }));
    expect(r.status).toBe(403);
  });
  it("429 with Retry-After when rate limited", async () => {
    const h = handle(opts({ limiter: new RateLimiter(1, 60_000) }), ok);
    await h(mkReq({ cookie: cookie(), body: { n: 1 } }));
    const r = await h(mkReq({ cookie: cookie(), body: { n: 1 } }));
    expect(r.status).toBe(429); expect(r.headers.get("retry-after")).toBeTruthy();
  });
  it("403 on cross-origin state-changing request (CSRF)", async () => {
    const r = await handle(opts(), ok)(mkReq({ cookie: cookie(), body: { n: 1 }, origin: "https://evil.test" }));
    expect(r.status).toBe(403);
  });
  it("500 hides thrown error details", async () => {
    const r = await handle(opts(), async () => { throw new Error("db password=hunter2"); })(mkReq({ cookie: cookie(), body: { n: 1 } }));
    expect(r.status).toBe(500); expect(JSON.stringify(await r.json())).not.toContain("hunter2");
  });
  it("sets no-store", async () => {
    const r = await handle(opts(), ok)(mkReq({ cookie: cookie(), body: { n: 1 } }));
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
