export type Role =
  | "PLATFORM_ADMIN" | "ORG_ADMIN" | "PROMPT_REVIEWER"
  | "DOCTOR" | "EDUCATOR" | "RESEARCHER" | "STUDENT" | "USER";
export interface Actor { userId: string; orgId: string | null; role: Role }
export type Visibility = "PRIVATE" | "ORGANIZATION" | "PLATFORM";
export interface Owned { ownerId: string | null; orgId: string | null; visibility: Visibility }

/** Deny by default. Org admins do NOT get implicit access to members' private data. */
export function canAccess(actor: Actor, r: Owned): boolean {
  if (r.visibility === "PLATFORM") return true;
  if (r.ownerId !== null && r.ownerId === actor.userId) return true;
  if (r.visibility === "ORGANIZATION") return !!actor.orgId && actor.orgId === r.orgId;
  return false;
}

export function canPublishOfficialPrompt(a: Actor): boolean {
  return a.role === "PLATFORM_ADMIN" || a.role === "PROMPT_REVIEWER";
}

export type AdminArea = "providers" | "tools" | "routing" | "audit" | "org_usage";
const AREA_ROLES: Record<AdminArea, Role[]> = {
  providers: ["PLATFORM_ADMIN"],
  tools: ["PLATFORM_ADMIN"],
  routing: ["PLATFORM_ADMIN"],
  audit: ["PLATFORM_ADMIN"],
  org_usage: ["PLATFORM_ADMIN", "ORG_ADMIN"],
};
export function canAdminister(a: Actor, area: AdminArea): boolean {
  return AREA_ROLES[area].includes(a.role);
}
