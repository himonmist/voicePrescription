import { describe, it, expect } from "vitest";
import { effectiveStatus, toCandidate } from "@/lib/ai/catalog/candidates";
import { CATALOG_SEED } from "@/lib/ai/catalog/seed";

const claude = CATALOG_SEED.find((t) => t.slug === "claude")!;
describe("effectiveStatus", () => {
  it("never reports IN_APP unless admin-verified AND adapter healthy", () => {
    expect(effectiveStatus({ ...claude, status: "API_KEY_REQUIRED" }, { healthy: true })).toBe("API_KEY_REQUIRED");
    expect(effectiveStatus({ ...claude, status: "IN_APP", lastVerifiedAt: "2026-09-01" }, undefined)).toBe("UNAVAILABLE");
    expect(effectiveStatus({ ...claude, status: "IN_APP", lastVerifiedAt: "2026-09-01" }, { healthy: false })).toBe("UNAVAILABLE");
    expect(effectiveStatus({ ...claude, status: "IN_APP", lastVerifiedAt: "2026-09-01" }, { healthy: true })).toBe("IN_APP");
  });
  it("external stays external, disabled stays disabled", () => {
    const ext = CATALOG_SEED.find((t) => t.slug === "gamma")!;
    expect(effectiveStatus(ext, { healthy: true })).toBe("EXTERNAL");
    expect(effectiveStatus({ ...claude, status: "DISABLED" }, { healthy: true })).toBe("DISABLED");
  });
});
describe("toCandidate", () => {
  it("maps entry to routing candidate with PHI approval from adapter", () => {
    const c = toCandidate({ ...claude, status: "IN_APP", lastVerifiedAt: "2026-09-01" }, { healthy: true, approvedForPHI: true });
    expect(c.status).toBe("IN_APP"); expect(c.approvedForPHI).toBe(true); expect(c.id).toBe("claude");
  });
});
