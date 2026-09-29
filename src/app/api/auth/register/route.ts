import { z } from "zod";
import { handlePublic } from "@/lib/api/public";
import { RateLimiter } from "@/lib/security/ratelimit";
import { registerUser } from "@/lib/auth/accounts";
import { prismaUsers } from "@/lib/auth/prismaUsers";

const limiter = new RateLimiter(5, 10 * 60_000);
const schema = z.object({ email: z.string().max(254), password: z.string().max(200), name: z.string().max(100).optional() }).strict();

export const POST = handlePublic({ schema, limiter }, async ({ body }) => {
  const r = await registerUser(prismaUsers, body);
  if (!r.ok) return Response.json({ error: { code: "REGISTRATION_FAILED", message: r.error } }, { status: 400 });
  return Response.json({ ok: true }, { status: 201 });
});
