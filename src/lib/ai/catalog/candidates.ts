import type { Candidate } from "@/lib/ai/router/router";
import type { CatalogEntry } from "./seed";

export interface AdapterState { healthy: boolean; approvedForPHI?: boolean }

/** An entry is executable in-app only if an admin verified it AND its adapter is currently healthy. */
export function effectiveStatus(e: CatalogEntry, a: AdapterState | undefined): Candidate["status"] | "API_KEY_REQUIRED" | "OAUTH_REQUIRED" | "BETA" {
  switch (e.status) {
    case "DISABLED": return "DISABLED";
    case "EXTERNAL": return "EXTERNAL";
    case "IN_APP":
    case "BETA":
      if (!e.lastVerifiedAt || !a?.healthy) return "UNAVAILABLE";
      return "IN_APP";
    case "UNAVAILABLE": return "UNAVAILABLE";
    default: return e.status; // API_KEY_REQUIRED / OAUTH_REQUIRED: not executable until configured + verified
  }
}

export function toCandidate(e: CatalogEntry, a: AdapterState | undefined): Candidate {
  const s = effectiveStatus(e, a);
  return {
    id: e.slug, name: e.name,
    status: s === "IN_APP" || s === "EXTERNAL" || s === "DISABLED" ? s : "UNAVAILABLE",
    capabilities: e.capabilities, inputTypes: e.inputTypes, outputTypes: e.outputTypes,
    contextTokens: 100_000, webSearch: e.capabilities.includes("web_search"), structuredOutput: true,
    healthy: !!a?.healthy, estCostPer1kTokens: 0.01, latencyMs: 2000,
    approvedForPHI: !!a?.approvedForPHI, eligiblePlans: e.eligiblePlans,
  };
}
