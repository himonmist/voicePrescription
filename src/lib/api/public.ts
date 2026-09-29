import type { ZodType } from "zod";
import { ConfigError } from "./errors";
import type { RateLimiter } from "@/lib/security/ratelimit";

const baseHeaders = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
const err = (status: number, code: string, message: string, extra: HeadersInit = {}) =>
  Response.json({ error: { code, message } }, { status, headers: { ...baseHeaders, ...extra } });

/** Vercel sets x-forwarded-for; the first entry is the client. Used only for rate-limit keys, never for authorization. */
export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function sessionCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
  return `sda_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export interface PublicCtx<T> { body: T; req: Request; ip: string }

/** For unauthenticated endpoints (login/register): CSRF origin check → per-IP rate limit → size → strict validation. */
export function handlePublic<T>(
  o: { schema: ZodType<T>; limiter: RateLimiter; maxBytes?: number },
  fn: (c: PublicCtx<T>) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    try {
      const origin = req.headers.get("origin");
      if (!origin || origin !== new URL(req.url).origin) return err(403, "CSRF_BLOCKED", "Cross-origin request rejected");
      const ip = clientIp(req);
      const rl = o.limiter.take(`${ip}:${new URL(req.url).pathname}`);
      if (!rl.allowed) return err(429, "RATE_LIMITED", "Too many attempts. Try again later.", { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) });
      const raw = await req.text();
      if (raw.length > (o.maxBytes ?? 10_000)) return err(413, "PAYLOAD_TOO_LARGE", "Request body too large");
      let json: unknown;
      try { json = JSON.parse(raw); } catch { return err(400, "VALIDATION_ERROR", "Malformed JSON"); }
      const parsed = o.schema.safeParse(json);
      if (!parsed.success) return err(400, "VALIDATION_ERROR", "Invalid request body");
      const res = await fn({ body: parsed.data, req, ip });
      const h = new Headers(res.headers);
      for (const [k, v] of Object.entries(baseHeaders)) h.set(k, v);
      return new Response(res.body, { status: res.status, headers: h });
    } catch (e) {
      if (e instanceof ConfigError) return err(503, "SERVICE_NOT_CONFIGURED", e.message);
      console.error("[api] unhandled error:", e instanceof Error ? e.name : "unknown");
      return err(500, "INTERNAL_ERROR", "Something went wrong");
    }
  };
}
