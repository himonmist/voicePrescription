import type { ZodType } from "zod";
import type { Actor, Role } from "@/lib/ai/security/authz";
import { verifySession } from "@/lib/auth/session";
import type { RateLimiter } from "@/lib/security/ratelimit";

export interface HandlerOpts<T> {
  secret: string; limiter: RateLimiter; schema?: ZodType<T>; roles?: Role[]; maxBytes?: number;
}
export interface Ctx<T> { actor: Actor; body: T; req: Request }

const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
const err = (status: number, code: string, message: string, extra: HeadersInit = {}) =>
  Response.json({ error: { code, message } }, { status, headers: { ...headers, ...extra } });

function cookieValue(req: Request, name: string): string | null {
  const m = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(name + "="));
  return m ? m.slice(name.length + 1) : null;
}

/** Uniform pipeline: CSRF origin check → auth → role → rate limit → size → parse → validate → handler. Deny by default. */
export function handle<T = undefined>(o: HandlerOpts<T>, fn: (c: Ctx<T>) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (mutating) {
        const origin = req.headers.get("origin");
        if (!origin || origin !== new URL(req.url).origin) return err(403, "CSRF_BLOCKED", "Cross-origin request rejected");
      }
      const tok = cookieValue(req, "sda_session");
      const actor = tok ? verifySession(tok, o.secret) : null;
      if (!actor) return err(401, "UNAUTHENTICATED", "Sign in required");
      if (o.roles && !o.roles.includes(actor.role)) return err(403, "FORBIDDEN", "You do not have permission");
      const rl = o.limiter.take(`${actor.userId}:${new URL(req.url).pathname}`);
      if (!rl.allowed) return err(429, "RATE_LIMITED", "Too many requests", { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) });

      let body = undefined as T;
      if (o.schema) {
        const raw = await req.text();
        if (raw.length > (o.maxBytes ?? 1_000_000)) return err(413, "PAYLOAD_TOO_LARGE", "Request body too large");
        let json: unknown;
        try { json = JSON.parse(raw); } catch { return err(400, "VALIDATION_ERROR", "Malformed JSON"); }
        const parsed = o.schema.safeParse(json);
        if (!parsed.success) return err(400, "VALIDATION_ERROR", "Invalid request body");
        body = parsed.data;
      }
      const res = await fn({ actor, body, req });
      const h = new Headers(res.headers);
      for (const [k, v] of Object.entries(headers)) h.set(k, v);
      return new Response(res.body, { status: res.status, headers: h });
    } catch {
      return err(500, "INTERNAL_ERROR", "Something went wrong");
    }
  };
}
