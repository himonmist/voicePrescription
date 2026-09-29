import { describe, it, expect } from "vitest";
import { canAccess, canPublishOfficialPrompt, canAdminister, type Actor } from "@/lib/ai/security/authz";

const alice: Actor = { userId: "u1", orgId: "o1", role: "DOCTOR" };
const bob: Actor = { userId: "u2", orgId: "o1", role: "DOCTOR" };
const eve: Actor = { userId: "u3", orgId: "o2", role: "DOCTOR" };
const admin: Actor = { userId: "u9", orgId: "o1", role: "ORG_ADMIN" };
const sysadmin: Actor = { userId: "u0", orgId: null, role: "PLATFORM_ADMIN" };

describe("canAccess (tenant isolation)", () => {
  const priv = { ownerId: "u1", orgId: "o1", visibility: "PRIVATE" as const };
  it("owner can access", () => expect(canAccess(alice, priv)).toBe(true));
  it("same-org colleague cannot see private", () => expect(canAccess(bob, priv)).toBe(false));
  it("other org cannot access", () => expect(canAccess(eve, priv)).toBe(false));
  it("org-shared visible to same org only", () => {
    const shared = { ...priv, visibility: "ORGANIZATION" as const };
    expect(canAccess(bob, shared)).toBe(true);
    expect(canAccess(eve, shared)).toBe(false);
  });
  it("org admin cannot read another member's private resource", () => expect(canAccess(admin, priv)).toBe(false));
  it("org-less actor cannot access org-owned org-shared resource", () => {
    expect(canAccess({ userId: "x", orgId: null, role: "DOCTOR" }, { ...priv, visibility: "ORGANIZATION" })).toBe(false);
  });
});

describe("role gates", () => {
  it("only admins/reviewers publish official prompts", () => {
    expect(canPublishOfficialPrompt(alice)).toBe(false);
    expect(canPublishOfficialPrompt({ ...alice, role: "PROMPT_REVIEWER" })).toBe(true);
    expect(canPublishOfficialPrompt(sysadmin)).toBe(true);
  });
  it("only platform admin administers providers", () => {
    expect(canAdminister(admin, "providers")).toBe(false);
    expect(canAdminister(sysadmin, "providers")).toBe(true);
    expect(canAdminister(admin, "org_usage")).toBe(true);
  });
});
