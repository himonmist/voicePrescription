import { z } from "zod";
import { handlePublic, sessionCookie } from "@/lib/api/public";
import { RateLimiter } from "@/lib/security/ratelimit";

export const POST = handlePublic({ schema: z.object({}).strict(), limiter: new RateLimiter(30, 60_000) }, async () =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": sessionCookie("", 0, process.env.NODE_ENV === "production") },
  }));
