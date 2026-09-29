import { createHmac, timingSafeEqual } from "node:crypto";
import type { Actor } from "@/lib/ai/security/authz";

const ROLES = new Set(["PLATFORM_ADMIN","ORG_ADMIN","PROMPT_REVIEWER","DOCTOR","EDUCATOR","RESEARCHER","STUDENT","USER"]);
const mac = (p: string, secret: string) => createHmac("sha256", secret).update(p).digest("base64url");

/** Minimal HMAC session. Replace with SmartDoctorAid's auth provider when merging; the Actor contract stays identical. */
export function signSession(actor: Actor, secret: string, ttlSeconds: number): string {
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  const p = Buffer.from(JSON.stringify({ ...actor, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${p}.${mac(p, secret)}`;
}

export function verifySession(token: string, secret: string): Actor | null {
  try {
    if (secret.length < 32) return null;
    const [p, s, extra] = token.split(".");
    if (!p || !s || extra !== undefined) return null;
    const a = Buffer.from(s), b = Buffer.from(mac(p, secret));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(p, "base64url").toString());
    if (typeof d.exp !== "number" || d.exp < Date.now()) return null;
    if (typeof d.userId !== "string" || !ROLES.has(d.role) || !(d.orgId === null || typeof d.orgId === "string")) return null;
    return { userId: d.userId, orgId: d.orgId, role: d.role };
  } catch { return null; }
}
