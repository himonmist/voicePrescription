import { RateLimiter } from "@/lib/security/ratelimit";
import { ConfigError } from "./errors";
import type { HandlerOpts } from "./handler";

export const limiter = new RateLimiter(60, 60_000);
export const execLimiter = new RateLimiter(10, 60_000);
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new ConfigError("Server session secret is not configured");
  return s;
}
export function apiOpts<T>(extra: Partial<HandlerOpts<T>> = {}): HandlerOpts<T> {
  return { secret: sessionSecret, limiter, ...extra };
}
