import { z } from "zod";
import { handlePublic, sessionCookie } from "@/lib/api/public";
import { sessionSecret } from "@/lib/api/common";
import { RateLimiter } from "@/lib/security/ratelimit";
import { loginUser, normalizeEmail } from "@/lib/auth/accounts";
import { prismaUsers } from "@/lib/auth/prismaUsers";
import { signSession } from "@/lib/auth/session";

const ipLimiter = new RateLimiter(10, 60_000);
const emailLimiter = new RateLimiter(5, 10 * 60_000); // slows credential stuffing against one account across many IPs
const SESSION_SECONDS = 8 * 60 * 60;
const schema = z.object({ email: z.string().max(254), password: z.string().min(1).max(200) }).strict();

export const POST = handlePublic({ schema, limiter: ipLimiter }, async ({ body }) => {
  const rl = emailLimiter.take(normalizeEmail(body.email));
  if (!rl.allowed)
    return Response.json({ error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  const r = await loginUser(prismaUsers, body);
  if (!r.ok || !r.actor) return Response.json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }, { status: 401 });
  const token = signSession(r.actor, sessionSecret(), SESSION_SECONDS);
  return new Response(JSON.stringify({ ok: true, role: r.actor.role }), {
    headers: { "content-type": "application/json", "set-cookie": sessionCookie(token, SESSION_SECONDS, process.env.NODE_ENV === "production") },
  });
});
