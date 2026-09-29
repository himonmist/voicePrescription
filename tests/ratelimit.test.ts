import { describe, it, expect } from "vitest";
import { RateLimiter } from "@/lib/security/ratelimit";
describe("RateLimiter", () => {
  it("allows up to limit then blocks, per key", () => {
    let now = 0; const rl = new RateLimiter(2, 1000, () => now);
    expect(rl.take("a").allowed).toBe(true); expect(rl.take("a").allowed).toBe(true);
    const r = rl.take("a"); expect(r.allowed).toBe(false); expect(r.retryAfterMs).toBeGreaterThan(0);
    expect(rl.take("b").allowed).toBe(true);
  });
  it("resets after window", () => {
    let now = 0; const rl = new RateLimiter(1, 1000, () => now);
    rl.take("a"); now = 1001; expect(rl.take("a").allowed).toBe(true);
  });
});
