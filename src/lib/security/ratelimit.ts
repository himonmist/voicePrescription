/** Fixed-window limiter. Single-instance only: swap for Redis/Upstash in multi-instance (Vercel) production. */
export class RateLimiter {
  private w = new Map<string, { start: number; n: number }>();
  constructor(private limit: number, private windowMs: number, private now: () => number = Date.now) {}
  take(key: string): { allowed: boolean; retryAfterMs: number } {
    const t = this.now(); const e = this.w.get(key);
    if (!e || t - e.start >= this.windowMs) { this.w.set(key, { start: t, n: 1 }); return { allowed: true, retryAfterMs: 0 }; }
    if (e.n >= this.limit) return { allowed: false, retryAfterMs: e.start + this.windowMs - t };
    e.n++; return { allowed: true, retryAfterMs: 0 };
  }
}
