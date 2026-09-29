import { signSession } from "@/lib/auth/session";
import { sessionSecret } from "@/lib/api/common";

/** Development-only sign-in. Hard-disabled in production and unless AI_DEV_MODE=true. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.AI_DEV_MODE !== "true") return new Response(null, { status: 404 });
  const role = new URL(req.url).searchParams.get("role") ?? "DOCTOR";
  const token = signSession({ userId: `dev-${role.toLowerCase()}`, orgId: "dev-org", role: role as never }, sessionSecret(), 3600);
  return new Response(JSON.stringify({ ok: true, devMode: true }), {
    headers: { "content-type": "application/json", "set-cookie": `sda_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600` },
  });
}
